# twitch导出的聊天


import json
import pandas as pd
from io import StringIO

def analyze_twitch_chat(json_file_path):
    """
    分析 Twitch 直播间聊天数据
    
    Args:
        json_file_path: Twitch 聊天 JSON 文件路径
        
    Returns:
        分析报告字符串
    """
    try:
        # 1. 加载数据
        with open(json_file_path, 'r', encoding='utf-8') as f:
            data = json.load(f)
        
        comments = data.get('comments', [])
        if not comments:
            return "没有找到聊天数据"

        # 2. 提取核心计算维度
        parsed_data = []
        for c in comments:
            commenter = c.get('commenter') or {}
            msg = c.get('message', {})
            parsed_data.append({
                'offset_seconds': c.get('content_offset_seconds', 0),
                'user': commenter.get('display_name', '[已注销]'),
                'badges': [b.get('_id') for b in msg.get('user_badges', [])]
            })
        
        df = pd.DataFrame(parsed_data)

        # 3. 高阶数据计算
        result = []
        result.append("="*40)
        result.append("📈 直播间弹幕高阶分析报告")
        result.append("="*40)

        # 指标 1：基础活跃度
        total_msgs = len(df)
        unique_users = df['user'].nunique()
        result.append(f"🔹 总弹幕数: {total_msgs} 条")
        result.append(f"🔹 独立发言人数: {unique_users} 人")
        result.append(f"🔹 平均每人发言: {total_msgs/unique_users:.1f} 条\n")

        # 指标 2：寻找高光时刻 (每 10 秒为一个分析窗口，寻找弹幕最密集的区间)
        result.append("🔥 互动最高光时刻 (Top 3):")
        # 将秒数向下取整到最近的 10 秒
        df['time_window'] = (df['offset_seconds'] // 10) * 10
        peak_moments = df.groupby('time_window').size().nlargest(3)
        for time_sec, count in peak_moments.items():
            result.append(f"   - 视频第 {int(time_sec)}s 到 {int(time_sec)+10}s: 爆发了 {count} 条弹幕")
        result.append("")

        # 指标 3：铁粉/带节奏用户分析
        result.append("👑 最活跃核心粉丝 (Top 5):")
        top_users = df['user'].value_counts().head(5)
        for user, count in top_users.items():
            result.append(f"   - {user}: 发言 {count} 次")
        result.append("")

        # 指标 4：粉丝成分分析 (徽章统计)
        result.append("💎 粉丝成分/付费身份画像:")
        # 展平徽章列表并统计
        all_badges = [badge for badges_list in df['badges'] for badge in badges_list]
        if all_badges:
            badge_counts = pd.Series(all_badges).value_counts()
            for badge, count in badge_counts.items():
                result.append(f"   - {badge.capitalize()} (付费/专属等级): {count} 人次")
        else:
            result.append("   - 未检测到特殊徽章")
        result.append("="*40)
        
        return "\n".join(result)
        
    except FileNotFoundError:
        return f"文件不存在: {json_file_path}"
    except json.JSONDecodeError:
        return "JSON 文件格式错误，请检查文件内容"
    except Exception as e:
        return f"分析出错: {str(e)}"


def analyze_twitch_chat_from_text(json_text):
    """
    从文本形式的 JSON 分析 Twitch 聊天数据
    
    Args:
        json_text: JSON 格式的文本内容
        
    Returns:
        分析报告字符串
    """
    try:
        # 1. 解析 JSON 文本
        data = json.loads(json_text)
        
        comments = data.get('comments', [])
        if not comments:
            return "没有找到聊天数据"

        # 2. 提取核心计算维度
        parsed_data = []
        for c in comments:
            commenter = c.get('commenter') or {}
            msg = c.get('message', {})
            parsed_data.append({
                'offset_seconds': c.get('content_offset_seconds', 0),
                'user': commenter.get('display_name', '[已注销]'),
                'badges': [b.get('_id') for b in msg.get('user_badges', [])]
            })
        
        df = pd.DataFrame(parsed_data)

        # 3. 高阶数据计算
        result = []
        result.append("="*40)
        result.append("📈 直播间弹幕高阶分析报告")
        result.append("="*40)

        # 指标 1：基础活跃度
        total_msgs = len(df)
        unique_users = df['user'].nunique()
        result.append(f"🔹 总弹幕数: {total_msgs} 条")
        result.append(f"🔹 独立发言人数: {unique_users} 人")
        result.append(f"🔹 平均每人发言: {total_msgs/unique_users:.1f} 条\n")

        # 指标 2：寻找高光时刻 (每 10 秒为一个分析窗口，寻找弹幕最密集的区间)
        result.append("🔥 互动最高光时刻 (Top 3):")
        # 将秒数向下取整到最近的 10 秒
        df['time_window'] = (df['offset_seconds'] // 10) * 10
        peak_moments = df.groupby('time_window').size().nlargest(3)
        for time_sec, count in peak_moments.items():
            result.append(f"   - 视频第 {int(time_sec)}s 到 {int(time_sec)+10}s: 爆发了 {count} 条弹幕")
        result.append("")

        # 指标 3：铁粉/带节奏用户分析
        result.append("👑 最活跃核心粉丝 (Top 5):")
        top_users = df['user'].value_counts().head(5)
        for user, count in top_users.items():
            result.append(f"   - {user}: 发言 {count} 次")
        result.append("")

        # 指标 4：粉丝成分分析 (徽章统计)
        result.append("💎 粉丝成分/付费身份画像:")
        # 展平徽章列表并统计
        all_badges = [badge for badges_list in df['badges'] for badge in badges_list]
        if all_badges:
            badge_counts = pd.Series(all_badges).value_counts()
            for badge, count in badge_counts.items():
                result.append(f"   - {badge.capitalize()} (付费/专属等级): {count} 人次")
        else:
            result.append("   - 未检测到特殊徽章")
        result.append("="*40)
        
        return "\n".join(result)
        
    except json.JSONDecodeError:
        return "JSON 格式错误，请检查输入的内容"
    except Exception as e:
        return f"分析出错: {str(e)}"
