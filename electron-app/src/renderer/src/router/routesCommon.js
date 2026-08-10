// import StatusCheck from '@renderer/pages/common/StatusCheck'
import FolderTree from '@renderer/pages/features/foldertree'
import UnicodeConverter from '@renderer/pages/features/unicode'
import ColorConverter from '@renderer/pages/features/color-converter'
import SimplifiedTraditional from '@renderer/pages/features/simplified-traditional'
import RegexFiler from '@renderer/pages/features/regex-filter'
import TextDiff from '@renderer/pages/features/text-diff'
import WordCount from '@renderer/pages/features/word-count'
import MarkdownOutline from '@renderer/pages/features/markdown-outline'
import MdToWeb from '@renderer/pages/features/md-to-web'
import CsvPreview from '@renderer/pages/features/csv-preview'
import FileReaderPage from '@renderer/pages/features/file-reader'
import DocMerge from '@renderer/pages/features/doc-merge'
import DiscordAnalysis from '@renderer/pages/features/discord-analysis'
import TwitchAnalysis from '@renderer/pages/features/twitch-analysis'
import WordFrequency from '@renderer/pages/features/word-frequency'
import Wordcloud from '@renderer/pages/features/wordcloud'
import TimestampConverter from '@renderer/pages/features/timestamp'
import WeeklyFolder from '@renderer/pages/features/weekly-folder'
import QrcodePage from '@renderer/pages/features/qrcode'
import WechatChatPage from '@renderer/pages/features/wechat-chat'
import PdfContrastPage from '@renderer/pages/features/pdf-contrast'

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
    },
    {
        path: "/tools/text-diff",
        component: TextDiff
    },
    {
        path: "/tools/word-count",
        component: WordCount
    },
    {
        path: "/tools/markdown-outline",
        component: MarkdownOutline
    },
    {
        path: "/tools/md-to-web",
        component: MdToWeb
    },
    {
        path: "/tools/csv-preview",
        component: CsvPreview
    },
    {
        path: "/tools/file-reader",
        component: FileReaderPage
    },
    {
        path: "/tools/doc-merge",
        component: DocMerge
    },
    {
        path: "/tools/discord-analysis",
        component: DiscordAnalysis
    },
    {
        path: "/tools/twitch-analysis",
        component: TwitchAnalysis
    },
    {
        path: "/tools/word-frequency",
        component: WordFrequency
    },
    {
        path: "/tools/wordcloud",
        component: Wordcloud
    },
    {
        path: "/tools/timestamp",
        component: TimestampConverter
    },
    {
        path: "/tools/weekly-folder",
        component: WeeklyFolder
    },
    {
        path: "/text-image/qrcode",
        component: QrcodePage
    },
    {
        path: "/text-image/wechat-chat",
        component: WechatChatPage
    },
    {
        path: "/text-image/pdf-contrast",
        component: PdfContrastPage
    }
]

export default routesCommon;