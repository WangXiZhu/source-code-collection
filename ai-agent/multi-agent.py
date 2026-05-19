import os
from dotenv import load_dotenv
from crewai import Agent, Task, Crew, Process
from langchain_google_genai import ChatGoogleGenerativeAI

def setup_environment():
    """加载环境变量并检查 API 密钥。"""
    load_dotenv()
    if not os.getenv("GOOGLE_API_KEY"):
         raise ValueError("GOOGLE_API_KEY 未设置，请在 .env 文件中配置。")

def main():
    """
    初始化并运行内容创作 AI 团队，使用最新 Gemini 模型。
    """
    setup_environment()

    # 指定语言模型
    llm = ChatGoogleGenerativeAI(model="gemini-2.0-flash")

    # 定义 Agent 角色与目标
    researcher = Agent(
         role='高级研究分析师',
         goal='查找并总结 AI 最新趋势。',
         backstory="你是一名经验丰富的研究分析师，擅长发现关键趋势并整合信息。",
         verbose=True,
         allow_delegation=False,
    )

    writer = Agent(
         role='技术内容写作者',
         goal='根据研究结果撰写清晰易懂的博客。',
         backstory="你是一名技术写作高手，能将复杂技术转化为通俗内容。",
         verbose=True,
         allow_delegation=False,
    )

    # 定义任务
    research_task = Task(
         description="调研 2024-2025 年 AI 三大新兴趋势，关注实际应用与影响。",
         expected_output="详细总结三大 AI 趋势，包括要点与来源。",
         agent=researcher,
    )

    writing_task = Task(
         description="根据研究结果撰写一篇 500 字博客，内容通俗易懂。",
         expected_output="完整的 500 字 AI 趋势博客。",
         agent=writer,
         context=[research_task],
    )

    # 创建团队
    blog_creation_crew = Crew(
         agents=[researcher, writer],
         tasks=[research_task, writing_task],
         process=Process.sequential,
         llm=llm,
         verbose=2
    )

    # 执行团队任务
    print("## 使用 Gemini 2.0 Flash 运行博客创作团队... ##")
    try:
         result = blog_creation_crew.kickoff()
         print("\n------------------\n")
         print("## 团队最终输出 ##")
         print(result)
    except Exception as e:
         print(f"\n发生异常：{e}")

if __name__ == "__main__":
    main()