#!/usr/bin/env python
# -*- coding: utf-8 -*-
"""
Text-maestro CLI PyInstaller 打包脚本

把 cli-app/main.py 与 gradio-app/utils*.py 打包为单文件可执行程序，
内置停用词等资源文件。最终用户无需安装 Python 环境即可使用。

用法（在 cli-app/ 目录下运行）：

    python build_exe.py             # 默认单文件 exe
    python build_exe.py --clean     # 打包前先清理上一次产物
    python build_exe.py --noconsole  # 测试用：无控制台窗口（不推荐 CLI 使用）

前置条件：
    pip install pyinstaller
    pip install -r ../gradio-app/requirements.txt

产物：
    cli-app/dist/Text-maestro-CLI-<version>.exe   (Windows)
    cli-app/dist/Text-maestro-CLI-<version>       (Linux/macOS)

说明：
    - --paths gradio-app：让 PyInstaller 把 gradio-app/ 下的 utils*.py 当作
      顶层模块收集进 exe。运行时 cli-app/main.py 顶部的 sys.path.insert 仍会
      跑一次（指向不存在的临时路径），但因模块已被收集进 _MEIPASS，import
      仍能成功，无需修改源码。
    - --add-data resources：把 gradio-app/resources/ 整个目录原样打入 exe 的
      _MEIPASS/resources，使 utils_wordcloud.py 顶部的
      os.path.dirname(os.path.abspath(__file__)) + 'resources/stopwords_cn_en.txt'
      在打包后仍能定位到文件。
    - utils_everything.py 不被 cli-app/main.py 引入，故 Everything-SDK 不打入。
"""
import os
import sys
import shutil
import subprocess
import argparse

# 从 cli-app/main.py 读取版本号，保持单一事实源
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from main import __version__  # noqa: E402

ROOT = os.path.dirname(os.path.abspath(__file__))
GRADIO_APP = os.path.normpath(os.path.join(ROOT, '..', 'gradio-app'))
GRADIO_RESOURCES = os.path.join('..', 'gradio-app', 'resources')
DIST = os.path.join(ROOT, 'dist')
BUILD = os.path.join(ROOT, 'build')
SPEC = os.path.join(ROOT, f'Text-maestro-CLI-{__version__}.spec')

EXE_NAME = f'Text-maestro-CLI-{__version__}'
ENTRY = os.path.join(ROOT, 'main.py')

# PyInstaller --add-data 源/目标分隔符：Windows 用 ';'，Unix 用 ':'
_SEP = ';' if os.name == 'nt' else ':'


def clean():
    """清理上一次构建产物"""
    for d in (DIST, BUILD):
        if os.path.isdir(d):
            shutil.rmtree(d, ignore_errors=True)
            print(f'[clean] 已删除 {d}')
    if os.path.isfile(SPEC):
        os.remove(SPEC)
        print(f'[clean] 已删除 {SPEC}')


def build(console: bool = True):
    """调用 PyInstaller 打包"""
    cmd = [
        sys.executable, '-m', 'PyInstaller',
        '--onefile',
        '--console' if console else '--noconsole',
        '--name', EXE_NAME,
        # 把 gradio-app/ 加入模块搜索路径，PyInstaller 会自动收集 utils*.py
        '--paths', GRADIO_APP,
        # 把 gradio-app/resources/ 数据文件打入 _MEIPASS/resources/
        '--add-data', f'{GRADIO_RESOURCES}{_SEP}resources',
        # 隐式依赖：jieba/wordcloud/pandas/opencc 通常能被自动追踪，
        # 但显式声明可避免某些动态 import 漏检
        '--hidden-import', 'jieba',
        '--hidden-import', 'wordcloud',
        '--hidden-import', 'matplotlib',
        '--hidden-import', 'pandas',
        '--hidden-import', 'opencc',
        # 收集 jieba 自带词典（dict.txt 等），否则运行时会从用户目录读取
        '--collect-data', 'jieba',
        # 排除不必要的模块以减小体积
        '--exclude-module', 'PyQt5',
        '--exclude-module', 'PyQt6',
        '--exclude-module', 'PySide2',
        '--exclude-module', 'PySide6',
        '--exclude-module', 'tkinter',
        '--exclude-module', 'IPython',
        '--exclude-module', 'notebook',
        '--exclude-module', 'jupyter',
        '--exclude-module', 'pytest',
        # 工作目录与产物目录
        '--workpath', BUILD,
        '--distpath', DIST,
        '--specpath', ROOT,
        # 覆盖已有的 spec 文件
        '--noconfirm',
        ENTRY,
    ]
    print('[build] 运行命令：')
    print('  ' + ' '.join(cmd))
    print()
    subprocess.run(cmd, check=True, cwd=ROOT)
    print()
    ext = '.exe' if os.name == 'nt' else ''
    print(f'[build] 打包完成：{os.path.join(DIST, EXE_NAME + ext)}')


def main():
    parser = argparse.ArgumentParser(
        description='Text-maestro CLI PyInstaller 打包脚本',
        formatter_class=argparse.RawDescriptionHelpFormatter,
    )
    parser.add_argument('--clean', action='store_true', help='打包前先清理 dist/ build/ 与 .spec 文件')
    parser.add_argument('--noconsole', action='store_true', help='无控制台窗口（不推荐 CLI 使用，仅测试用）')
    args = parser.parse_args()

    if args.clean:
        clean()
    build(console=not args.noconsole)


if __name__ == '__main__':
    main()
