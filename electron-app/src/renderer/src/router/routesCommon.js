// import StatusCheck from '@renderer/pages/common/StatusCheck'
import FolderTree from '@renderer/pages/features/foldertree'
import UnicodeConverter from '@renderer/pages/features/unicode'
import ColorConverter from '@renderer/pages/features/color-converter'
import SimplifiedTraditional from '@renderer/pages/features/simplified-traditional'
import RegexFiler from '@renderer/pages/features/regex-filter'

const routesCommon = [
    {
        path: "/common/folder-tree",
        component: FolderTree
    },
    {
        path: "/tools/unicode",
        component: UnicodeConverter
    },
    {
        path: "/tools/color-converter",
        component: ColorConverter
    },
    {
        path: "/tools/simplified-traditional",
        component: SimplifiedTraditional
    },
    {
        path: "/tools/regex-filter",
        component: RegexFiler
    }
]

export default routesCommon;