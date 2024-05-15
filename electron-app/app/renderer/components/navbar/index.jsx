// renderer/container/root/index.tsx
import React from 'react';
import './index.less';

import { Tabs, Typography } from "@arco-design/web-react";

const TabPane = Tabs.TabPane;

const { Text } = Typography;


import { Menu } from "@arco-design/web-react";
import {
    IconDriveFile,
    IconFolder,

    IconSafe,

    IconSettings,
    IconFire,
} from "@arco-design/web-react/icon";
const MenuItem = Menu.Item;
const SubMenu = Menu.SubMenu;


import { useHistory } from 'react-router';


const NavBar = () => {
    const history = useHistory(); // 使用 useHistory 钩子 版本问题懒得改了（这都是屎山改不动的）

    return (
        // <div className="menu-demo-round" style={{ height: '100%' , width: 200 }}>
            <Menu style={{ height: '100%', width: 225 }} mode='vertical' hasCollapseButton>
                <MenuItem key="0">
                    <IconFolder />
                    单一文件夹分析
                </MenuItem>
                <SubMenu
                    key="1"
                    title={
                        <>
                            <IconDriveFile />
                            复合web分析
                        </>
                    }
                >
                    <MenuItem key="1_0">discord服务器聊天记录</MenuItem>
                    <MenuItem key="1_1">知乎用户回答</MenuItem>
                    <MenuItem key="1_2">b站收藏夹</MenuItem>
                </SubMenu>
                <SubMenu
                    key="2"
                    title={
                        <>
                            <IconDriveFile />
                            复合本地文档分析
                        </>
                    }
                >
                    <MenuItem key="2_0">obsidian仓库</MenuItem>
                    <MenuItem key="2_1">（待更新）</MenuItem>
                </SubMenu>

                <MenuItem key="3" onClick={() => history.push('/document')}>
                <IconSafe />
                官网丨文档丨帮助
            </MenuItem>
            
            <MenuItem key="4" onClick={() => history.push('/')}>
                <IconSettings />
                Text-maestro设置
            </MenuItem>
            </Menu>
        // </div>
    );
}

export default NavBar;

