// renderer/container/root/index.tsx
import React from 'react';
import './index.less';

import { Tabs, Typography } from "@arco-design/web-react";
import {
    IconDriveFile,
    IconClockCircle,
    IconFolder,
} from "@arco-design/web-react/icon";
const TabPane = Tabs.TabPane;
const style = {
    // textAlign: "center",
    // marginTop: 20,
};

const { Text } = Typography;


import { Menu } from "@arco-design/web-react";
import {
    IconApps,
    IconSafe,
    IconBulb,
    IconRobot,
    IconFire,
} from "@arco-design/web-react/icon";
const MenuItem = Menu.Item;
const SubMenu = Menu.SubMenu;


const NavBar = () => {

    return (
        <div className="menu-demo-round" style={{ height: 600 }}>
            <Menu style={{ width: 200 }} mode="pop" hasCollapseButton>
                <MenuItem key="0">
                    <IconApps />
                    Navigation 1
                </MenuItem>
                <SubMenu
                    key="1"
                    title={
                        <>
                            <IconRobot />
                            Navigation 2
                        </>
                    }
                >
                    <MenuItem key="1_0">Beijing</MenuItem>
                    <MenuItem key="1_1">Shanghai</MenuItem>
                    <MenuItem key="1_2">Guangzhou</MenuItem>
                </SubMenu>
                <SubMenu
                    key="2"
                    title={
                        <>
                            <IconBulb />
                            Navigation 3
                        </>
                    }
                >
                    <MenuItem key="2_0">Wuhan</MenuItem>
                    <MenuItem key="2_1">Chengdu</MenuItem>
                </SubMenu>
                <MenuItem key="3">
                    <IconSafe />
                    Navigation 4
                </MenuItem>
                <MenuItem key="4">
                    <IconFire />
                    Navigation 5
                </MenuItem>
            </Menu>
        </div>
    );
}

export default NavBar;

