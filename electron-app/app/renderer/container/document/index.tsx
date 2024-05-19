
import React from 'react';
// import './index.less';

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

const { Title, Paragraph, Text } = Typography;





// （这里之前写了arco less未生效的推理，现在lessloader修好自然用不到了）

function Document() {
  return(
  <div>
      <Typography style={style}>
        <Title>测试md</Title>
        你好!<br></br>
        这里是文档页面<br></br>
        "你可以在这里查看和编辑你的obsidian仓库"——以上内容由cursor生成<br></br>
        这里用来写一些名词解释，我一般用md写好放在这里。举例：

        <Title>“复合”</Title>
        <Paragraph>“复合”的意思是指代，这一分析的过程中，既不必针对单一文件，也不必针对一个文件夹中的所有文件。  </Paragraph>
        <Paragraph>换言之，“复合”分析允许用户对一批文件进行筛选，对选中的文件进行合并/清洗等预处理操作，最后完成类似于单一文件的分析。  </Paragraph>
      </Typography>
  </div> 
  );
}

export default Document;

