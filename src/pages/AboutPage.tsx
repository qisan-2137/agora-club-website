const sections = [
	{
		title: "社团是什么",
		body: "对话广场是一个围绕表达、交流与思辨展开的学校社团官网与档案平台。它既是线下活动的组织者，也是公开记录每一次演讲与分享的数字入口，让每一份内容都能被持续留存、再次阅读与重新讨论。",
	},
	{
		title: "为什么建立社团",
		body: "许多学生拥有强烈的表达欲、分享欲与思考欲，却缺少一个正式、稳定、可持续的场域去表达观点、交换经验与打磨论证。对话广场希望让热爱表达的人被看见，让愿意思考的人彼此遇见。",
	},
	{
		title: "如何运行社团",
		body: "社团以定期演讲、主题分享、开放讨论和档案留存为核心机制。每次活动以明确主题为中心，强调演讲者准备、现场讨论和事后整理三段式闭环。PPT 与反馈文字会被统一整理到官网，形成可追溯的社团知识档案。",
	},
	{
		title: "创始人与传承",
		body: "对话广场由一群重视理性表达与公共交流的同学发起。创始阶段强调方向的建立，而长期价值则来自一届届成员对规则、主题与社团气质的延续。官网的存在本身，也是传承的一部分。",
	},
];

export function AboutPage() {
	return (
		<div className="page">
			<section className="section-card section-card--wide">
				<div className="section-heading">
					<div>
						<p className="section-label">About the Club</p>
						<h1>社团介绍</h1>
					</div>
				</div>
				<div className="info-grid">
					{sections.map((section) => (
						<section key={section.title} className="info-block">
							<h2>{section.title}</h2>
							<p>{section.body}</p>
						</section>
					))}
				</div>
			</section>
		</div>
	);
}
