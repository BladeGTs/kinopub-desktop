"""Package electron-builder's linux-unpacked output on any OS (Python stdlib only)."""
import hashlib
import io
from pathlib import Path, PurePosixPath
import re
import shutil
import tarfile

APP = Path(__file__).resolve().parents[1]
SOURCE = APP / 'release/linux-unpacked'
VERSION = re.search(r'version:\s*([\d.]+)', (APP / 'electron-builder.yml').read_text()).group(1)
DEB_VERSION = VERSION
PACKAGE = 'kinopub-tv'
PREFIX = 'opt/KinoPub'
BUILD = APP / 'release/deb-build'
BUILD.mkdir(parents=True, exist_ok=True)
BUILDER = next((APP / 'node_modules/.pnpm').glob('app-builder-lib@*/node_modules/app-builder-lib'))
TEMPLATES = BUILDER / 'templates/linux'


def template(name):
    return (TEMPLATES / name).read_text().replace('${executable}', PACKAGE).replace('${sanitizedProductName}', 'KinoPub')


def add_directory(archive, name):
    """dpkg requires explicit parent entries; unlike tar it will not invent them."""
    if not hasattr(archive, '_deb_directories'):
        archive._deb_directories = set()
    if name in archive._deb_directories:
        return
    if name != '.':
        add_directory(archive, str(PurePosixPath(name).parent))
    entry = tarfile.TarInfo('./' + name)
    entry.type = tarfile.DIRTYPE
    entry.mode = 0o755
    entry.uid = entry.gid = 0
    archive.addfile(entry)
    archive._deb_directories.add(name)


def add_bytes(archive, name, content, mode=0o644):
    add_directory(archive, str(PurePosixPath(name).parent))
    if isinstance(content, str):
        content = content.encode('utf-8')
    entry = tarfile.TarInfo('./' + name)
    entry.size = len(content)
    entry.mode = mode
    entry.uid = entry.gid = 0
    archive.addfile(entry, io.BytesIO(content))


binary = SOURCE / PACKAGE
assert binary.is_file() and (SOURCE / 'resources/app.asar').is_file(), 'Build Linux --dir first'
with binary.open('rb') as stream:
    elf = stream.read(20)
assert elf[:4] == b'\x7fELF' and elf[4:6] == b'\x02\x01' and elf[18:20] == b'\x3e\x00', 'Expected Linux amd64 executable'

checksums = []
installed_size = 0
data_path = BUILD / 'data.tar.gz'
with tarfile.open(data_path, 'w:gz', format=tarfile.GNU_FORMAT, compresslevel=6) as archive:
    for source in sorted(SOURCE.rglob('*')):
        if source.is_dir():
            add_directory(archive, PREFIX + '/' + source.relative_to(SOURCE).as_posix())
            continue
        assert not source.is_symlink(), f'Unexpected symlink: {source}'
        name = PREFIX + '/' + source.relative_to(SOURCE).as_posix()
        add_directory(archive, str(PurePosixPath(name).parent))
        with source.open('rb') as stream:
            magic = stream.read(4)
        entry = archive.gettarinfo(str(source), './' + name)
        entry.uid = entry.gid = 0
        entry.uname = entry.gname = ''
        entry.mode = 0o755 if magic == b'\x7fELF' else 0o644
        with source.open('rb') as stream:
            archive.addfile(entry, stream)
        with source.open('rb') as stream:
            digest = hashlib.file_digest(stream, 'md5').hexdigest()
        checksums.append(f'{digest}  {name}\n')
        installed_size += entry.size

    extras = {
        f'{PREFIX}/resources/apparmor-profile': template('apparmor-profile.tpl'),
        f'usr/share/applications/{PACKAGE}.desktop': f'''[Desktop Entry]
Name=KinoPub
Comment=KinoPub desktop client
Exec=/opt/KinoPub/{PACKAGE} %U
Terminal=false
Type=Application
Icon={PACKAGE}
StartupWMClass={PACKAGE}
Categories=AudioVideo;Video;
''',
        f'usr/share/icons/hicolor/512x512/apps/{PACKAGE}.png': (APP / 'electron/icons/icon.png').read_bytes(),
        f'usr/share/doc/{PACKAGE}/copyright': (APP.parent / 'LICENSE').read_bytes(),
    }
    for name, content in extras.items():
        content = content.encode() if isinstance(content, str) else content
        add_bytes(archive, name, content)
        checksums.append(f'{hashlib.md5(content).hexdigest()}  {name}\n')
        installed_size += len(content)

depends = ('libc6 (>= 2.31), libgtk-3-0, libnotify4, libnss3, libnspr4, libxss1, libxtst6, '
           'xdg-utils, libatspi2.0-0, libuuid1, libsecret-1-0, libgbm1, libdrm2, '
           'libasound2t64 | libasound2, libx11-6, libxcb1, libxcomposite1, libxdamage1, '
           'libxfixes3, libxrandr2, libpango-1.0-0, libcairo2, libdbus-1-3, libcups2t64 | libcups2')
control = f'''Package: {PACKAGE}
Version: {DEB_VERSION}
Architecture: amd64
Maintainer: KinoPub TV contributors <maintainers@kinopub.invalid>
Section: video
Priority: optional
Installed-Size: {(installed_size + 1023) // 1024}
Depends: {depends}
Description: KinoPub desktop client
 Desktop application with movie catalog, video playback and proxy settings.
'''
control_path = BUILD / 'control.tar.gz'
with tarfile.open(control_path, 'w:gz', format=tarfile.GNU_FORMAT) as archive:
    add_bytes(archive, 'control', control)
    add_bytes(archive, 'md5sums', ''.join(checksums))
    add_bytes(archive, 'postinst', template('after-install.tpl'), 0o755)
    postrm = template('after-remove.tpl').replace('#!/bin/bash', '#!/bin/bash\nif [ "$1" != remove ] && [ "$1" != purge ]; then exit 0; fi', 1)
    add_bytes(archive, 'postrm', postrm, 0o755)

output = APP / f'release/{PACKAGE}_{DEB_VERSION}_amd64.deb'
with output.open('wb') as package:
    package.write(b'!<arch>\n')
    for name, source in [('debian-binary', b'2.0\n'), ('control.tar.gz', control_path), ('data.tar.gz', data_path)]:
        size = len(source) if isinstance(source, bytes) else source.stat().st_size
        header = f'{name + "/":<16}{0:<12}{0:<6}{0:<6}{"100644":<8}{size:<10}`\n'
        assert len(header) == 60
        package.write(header.encode('ascii'))
        if isinstance(source, bytes):
            package.write(source)
        else:
            with source.open('rb') as stream:
                shutil.copyfileobj(stream, package)
        if size % 2:
            package.write(b'\n')
with output.open('rb') as stream:
    sha256 = hashlib.file_digest(stream, 'sha256').hexdigest()
output.with_suffix('.deb.sha256').write_text(f'{sha256}  {output.name}\n', encoding='ascii')
print(f'Built: {output.name} ({output.stat().st_size:,} bytes)')
print(f'SHA256: {sha256}')
