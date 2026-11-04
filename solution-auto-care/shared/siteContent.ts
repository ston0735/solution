export type ContentFieldType = "text" | "textarea" | "image" | "url";

export interface ContentFieldDefinition {
  key: string;
  label: string;
  page: string;
  type: ContentFieldType;
}

export interface BlogPost {
  id: string;
  slug: string;
  title: string;
  category: string;
  summary: string;
  body: string;
  image: string;
  published: boolean;
  date: string;
}

export interface SiteContent {
  schemaVersion: 1;
  fields: Record<string, string>;
  posts: BlogPost[];
}

const field = (
  key: string,
  label: string,
  page: string,
  type: ContentFieldType = "text"
): ContentFieldDefinition => ({ key, label, page, type });

/**
 * The public editing contract. Keep this list flat so an admin form can render it
 * without knowing how any individual page is composed.
 */
export const CONTENT_FIELDS: ContentFieldDefinition[] = [
  field("global.logo", "品牌 Logo", "global", "image"),
  field("global.logoAlt", "品牌 Logo 替代文字", "global"),
  field("global.ksgLogo", "KSG Logo", "global", "image"),
  field("global.ksgLogoAlt", "KSG Logo 替代文字", "global"),
  field("global.lineUrl", "官方 LINE 連結", "global", "url"),
  field("global.lineLabel", "官方 LINE 按鈕文字", "global"),
  field("global.logoButtonAria", "Logo 回首頁 aria-label", "global"),
  field("global.mainNavAria", "桌面導覽 aria-label", "global"),
  field("global.mobileNavAria", "行動版導覽 aria-label", "global"),
  field("global.menuOpenAria", "開啟選單 aria-label", "global"),
  field("global.menuCloseAria", "關閉選單 aria-label", "global"),
  field("global.memberLabel", "會員專區按鈕文字", "global"),
  field("global.memberLoadingLabel", "會員狀態確認中文字", "global"),
  field("global.headerBookingCta", "頁首預約按鈕文字", "global"),
  field("global.adminLinkLabel", "內容後台連結文字", "global"),
  field("global.previewBannerLabel", "草稿預覽標示", "global"),
  field("global.previewReturnLabel", "返回後台連結文字", "global"),
  field("global.servicesMenuToggle", "展開服務選單替代文字", "global"),
  field("global.servicesAllLabel", "所有服務選單連結文字", "global"),
  field("nav.services", "服務項目導覽文字", "nav"),
  field("nav.ai", "AI 車色導覽文字", "nav"),
  field("nav.process", "施工流程導覽文字", "nav"),
  field("nav.blog", "Blog／改裝案例導覽文字", "nav"),
  field("nav.about", "關於 Solution 導覽文字", "nav"),
  field("nav.contact", "預約諮詢導覽文字", "nav"),
  field("nav.member", "會員專區導覽文字", "nav"),

  field("home.hero.eyebrow", "首頁 Hero 眉標", "home"),
  field("home.hero.titleLine1", "首頁 Hero 標題第一行", "home"),
  field("home.hero.titleLine2", "首頁 Hero 標題第二行", "home"),
  field("home.hero.description", "首頁 Hero 描述", "home", "textarea"),
  field("home.hero.image", "首頁 Hero 圖片", "home", "image"),
  field("home.hero.imageAlt", "首頁 Hero 圖片替代文字", "home", "textarea"),
  field("home.hero.primaryCta", "首頁 Hero 主要按鈕", "home"),
  field("home.hero.secondaryCta", "首頁 Hero 次要按鈕", "home"),
  field("home.hero.scanLabel", "Hero 掃描標籤", "home"),
  field("home.hero.finishLabel", "Hero 完成度標籤", "home"),
  field("home.hero.finishValue", "Hero 完成度數值", "home"),
  field("home.hero.reflectionLabel", "Hero 反光標籤", "home"),
  field("home.hero.reflectionValue", "Hero 反光數值", "home"),
  field("home.hero.edgeLabel", "Hero 膜邊標籤", "home"),
  field("home.hero.edgeValue", "Hero 膜邊數值", "home"),
  field("home.hero.panelEyebrow", "Hero 右側面板眉標", "home"),
  field("home.hero.panelCopy", "Hero 右側面板文字", "home", "textarea"),
  field("home.hero.scrollAria", "Hero 向下按鈕 aria-label", "home"),
  field("home.servicesLinkCta", "首頁查看服務按鈕", "home"),
  field("home.processLinkCta", "首頁查看施工流程按鈕", "home"),

  field("about.eyebrow", "關於區塊眉標", "about"),
  field("about.intro", "關於區塊引言", "about", "textarea"),
  field("about.titleLine1", "關於標題第一行", "about"),
  field("about.titleLine2", "關於標題第二行", "about"),
  field("about.titleAccent", "關於標題強調字", "about"),
  field("about.value.0.label", "關於價值一標籤", "about"),
  field("about.value.0.copy", "關於價值一說明", "about", "textarea"),
  field("about.value.1.label", "關於價值二標籤", "about"),
  field("about.value.1.copy", "關於價值二說明", "about", "textarea"),
  field("about.value.2.label", "關於價值三標籤", "about"),
  field("about.value.2.copy", "關於價值三說明", "about", "textarea"),

  field("services.eyebrow", "服務區塊眉標", "services"),
  field("services.titleLine1", "服務標題第一行", "services"),
  field("services.titleLine2", "服務標題第二行", "services"),
  field("services.description", "服務區塊描述", "services", "textarea"),
  field("services.0.number", "服務一編號", "services"),
  field("services.0.title", "服務一標題", "services"),
  field("services.0.english", "服務一英文標題", "services"),
  field("services.0.description", "服務一說明", "services", "textarea"),
  field("services.0.detail", "服務一細節標籤", "services"),
  field("services.0.image", "服務一圖片", "services", "image"),
  field("services.0.imageAlt", "服務一圖片替代文字", "services", "textarea"),
  field("services.0.ctaAriaLabel", "服務一諮詢按鈕 aria-label", "services"),
  field("services.1.number", "服務二編號", "services"),
  field("services.1.title", "服務二標題", "services"),
  field("services.1.english", "服務二英文標題", "services"),
  field("services.1.description", "服務二說明", "services", "textarea"),
  field("services.1.detail", "服務二細節標籤", "services"),
  field("services.1.image", "服務二圖片", "services", "image"),
  field("services.1.imageAlt", "服務二圖片替代文字", "services", "textarea"),
  field("services.1.ctaAriaLabel", "服務二諮詢按鈕 aria-label", "services"),
  field("services.2.number", "服務三編號", "services"),
  field("services.2.title", "服務三標題", "services"),
  field("services.2.english", "服務三英文標題", "services"),
  field("services.2.description", "服務三說明", "services", "textarea"),
  field("services.2.detail", "服務三細節標籤", "services"),
  field("services.2.image", "服務三圖片", "services", "image"),
  field("services.2.imageAlt", "服務三圖片替代文字", "services", "textarea"),
  field("services.2.ctaAriaLabel", "服務三諮詢按鈕 aria-label", "services"),

  field("ai.eyebrow", "AI 車色眉標", "ai"),
  field("ai.intro", "AI 車色引言", "ai", "textarea"),
  field("ai.titleLine1", "AI 車色標題第一行", "ai"),
  field("ai.titleLine2", "AI 車色標題第二行", "ai"),
  field("ai.description", "AI 車色頁描述", "ai", "textarea"),
  field("ai.inputModuleLabel", "AI 輸入模組標籤", "ai"),
  field("ai.inputModuleStep", "AI 輸入模組步驟", "ai"),
  field("ai.photo.stepLabel", "AI 上傳照片標籤", "ai"),
  field("ai.photo.selectLabel", "AI 選擇照片按鈕", "ai"),
  field("ai.photo.formatHint", "AI 照片格式提示", "ai", "textarea"),
  field("ai.photo.uploadedAlt", "AI 已上傳照片替代文字", "ai", "textarea"),
  field("ai.photo.removeAriaLabel", "AI 移除照片 aria-label", "ai"),
  field("ai.vehicle.label", "AI 車款欄位標籤", "ai"),
  field("ai.vehicle.placeholder", "AI 車款欄位 placeholder", "ai"),
  field("ai.vehicle.help", "AI 車款欄位說明", "ai", "textarea"),
  field("ai.catalog.stepLabel", "AI 型錄色卡標籤", "ai"),
  field("ai.catalog.countSuffix", "AI 型錄色卡數量標籤", "ai"),
  field("ai.catalog.categorySelectLabel", "AI 色系選擇標籤", "ai"),
  field("ai.catalog.colorSelectLabel", "AI 型錄色號選擇標籤", "ai"),
  field("ai.catalog.colorCountSuffix", "AI 色系數量單位", "ai"),
  field("ai.catalog.swatchAltSuffix", "AI 實體色卡替代文字", "ai"),
  field("ai.catalog.description", "AI 型錄說明", "ai", "textarea"),
  field("ai.catalog.customLabel", "AI 自訂色號標籤", "ai"),
  field("ai.catalog.customPlaceholder", "AI 自訂色號 placeholder", "ai"),
  field("ai.partial.stepLabel", "AI 局部包膜標籤", "ai"),
  field("ai.partial.description", "AI 局部包膜說明", "ai", "textarea"),
  field("ai.partial.finishGroupSuffix", "AI 材質選擇 aria-label 後綴", "ai"),
  field("ai.partial.appliedPrefix", "AI 已套用前綴", "ai"),
  field("ai.error.previewLoad", "AI 預覽圖片讀取錯誤", "ai"),
  field("ai.error.previewConvert", "AI 預覽圖片轉換錯誤", "ai"),
  field("ai.error.fileType", "AI 檔案格式錯誤", "ai", "textarea"),
  field("ai.error.fileRead", "AI 照片讀取錯誤", "ai"),
  field("ai.error.fileFormat", "AI 照片格式辨識錯誤", "ai"),
  field("ai.error.dimensions", "AI 照片尺寸辨識錯誤", "ai"),
  field("ai.error.photoRequired", "AI 必填照片錯誤", "ai"),
  field("ai.error.colorRequired", "AI 必填色號錯誤", "ai"),
  field("ai.auth.loginRequired", "AI 登入提示標題", "ai"),
  field("ai.auth.loginRequiredDescription", "AI 登入提示說明", "ai"),
  field("ai.toast.generateSuccess", "AI 生成成功標題", "ai"),
  field("ai.toast.saved", "AI 保存成功標題", "ai"),
  field("ai.toast.savedDescription", "AI 保存成功說明", "ai"),
  field("ai.toast.saveFailed", "AI 保存失敗標題", "ai"),
  field("ai.toast.historySaveWarning", "AI 預覽歷史保存警告", "ai"),
  field("ai.toast.historySaveWarningDescription", "AI 歷史保存警告說明", "ai"),
  field("ai.toast.loginSaveDescription", "AI 登入會員保存說明", "ai"),
  field("ai.toast.generateFailed", "AI 生成失敗標題", "ai"),
  field("ai.toast.downloadStarted", "AI 下載開始提示", "ai"),
  field("ai.toast.savedStatus", "AI 已保存狀態", "ai"),
  field("ai.toast.temporaryStatus", "AI 暫存狀態", "ai", "textarea"),
  field("ai.toast.previewSavedDescription", "AI 已暫存生成說明後綴", "ai"),
  field("ai.toast.previewDescription", "AI 生成說明後綴", "ai"),
  field("ai.saveButton.saving", "AI 保存中按鈕", "ai"),
  field("ai.saveButton.saved", "AI 已保存按鈕", "ai"),
  field("ai.saveButton.default", "AI 儲存圖片按鈕", "ai"),
  field("ai.action.compare", "AI A／B 比較按鈕", "ai"),
  field("ai.action.download", "AI 下載圖片按鈕", "ai"),
  field("ai.action.regenerate", "AI 重新生成按鈕", "ai"),
  field("ai.generateButton.processing", "AI 生成中按鈕", "ai"),
  field("ai.generateButton.default", "AI 生成按鈕", "ai"),
  field("ai.output.beforeLabel", "AI 比較前標籤", "ai"),
  field("ai.output.afterLabel", "AI 比較後標籤", "ai"),
  field("ai.output.compareAlt", "AI 比較圖片替代文字", "ai", "textarea"),
  field("ai.output.imageAltPrefix", "AI 生成圖片替代文字前綴", "ai"),
  field("ai.output.generatedLabel", "AI 生成完成標籤", "ai"),
  field("ai.output.targetLabel", "AI 目標色號標籤", "ai"),
  field("ai.output.ratioLabel", "AI 輸出比例標籤", "ai"),
  field("ai.output.partialLabel", "AI 局部包膜標籤", "ai"),
  field("ai.output.materialCardLabel", "AI PDF 色卡標籤", "ai"),
  field("ai.output.materialCardEnabled", "AI 色卡參考啟用文字", "ai"),
  field("ai.output.materialCardHelp", "AI 色卡參考說明", "ai", "textarea"),
  field("ai.processing.title", "AI 處理中標題", "ai"),
  field("ai.processing.description", "AI 處理中說明", "ai", "textarea"),
  field("ai.output.placeholderLabel", "AI 輸出預覽標籤", "ai"),
  field("ai.output.placeholderTitleLine1", "AI 預覽佔位標題一", "ai"),
  field("ai.output.placeholderTitleLine2", "AI 預覽佔位標題二", "ai"),
  field("ai.output.placeholderTitleLine3", "AI 預覽佔位標題三", "ai"),
  field(
    "ai.output.placeholderDescription",
    "AI 預覽佔位說明",
    "ai",
    "textarea"
  ),
  field("ai.storageNotice", "AI 圖片保存提示", "ai", "textarea"),
  field("ai.disclaimer", "AI 功能免責說明", "ai", "textarea"),

  field("process.eyebrow", "流程區塊眉標", "process"),
  field("process.titleLine1", "流程標題第一行", "process"),
  field("process.titleLine2", "流程標題第二行", "process"),
  field("process.description", "流程區塊描述", "process", "textarea"),
  field("process.0.number", "流程一編號", "process"),
  field("process.0.title", "流程一標題", "process"),
  field("process.0.description", "流程一說明", "process", "textarea"),
  field("process.1.number", "流程二編號", "process"),
  field("process.1.title", "流程二標題", "process"),
  field("process.1.description", "流程二說明", "process", "textarea"),
  field("process.2.number", "流程三編號", "process"),
  field("process.2.title", "流程三標題", "process"),
  field("process.2.description", "流程三說明", "process", "textarea"),
  field("process.3.number", "流程四編號", "process"),
  field("process.3.title", "流程四標題", "process"),
  field("process.3.description", "流程四說明", "process", "textarea"),

  field("aftercare.eyebrow", "養護區塊眉標", "aftercare"),
  field("aftercare.titleLine1", "養護標題第一行", "aftercare"),
  field("aftercare.titleLine2", "養護標題第二行", "aftercare"),
  field("aftercare.titleLine3", "養護標題第三行", "aftercare"),
  field("aftercare.description", "養護區塊描述", "aftercare", "textarea"),
  field("aftercare.badge.0.label", "養護徽章一", "aftercare"),
  field("aftercare.badge.1.label", "養護徽章二", "aftercare"),
  field("aftercare.badge.2.label", "養護徽章三", "aftercare"),

  field("contact.eyebrow", "聯絡區塊眉標", "contact"),
  field("contact.titleLine1", "聯絡標題第一行", "contact"),
  field("contact.titleLine2", "聯絡標題第二行", "contact"),
  field("contact.titleLine3", "聯絡標題第三行", "contact"),
  field("contact.description", "聯絡區塊描述", "contact", "textarea"),
  field("contact.primaryCta", "聯絡主要按鈕", "contact"),
  field("contact.bookingToastTitle", "預約提示標題", "contact"),
  field(
    "contact.bookingToastDescription",
    "預約提示說明",
    "contact",
    "textarea"
  ),

  field("footer.descriptionLine1", "頁尾描述第一行", "footer"),
  field("footer.descriptionLine2", "頁尾描述第二行", "footer", "textarea"),
  field("footer.logoAlt", "頁尾 Logo 替代文字", "footer"),
  field("footer.copyright", "頁尾版權文字", "footer"),
  field("footer.credit", "頁尾製作文字", "footer"),

  field("page.services.eyebrow", "服務頁眉標", "services"),
  field("page.services.title", "服務頁標題", "services"),
  field("page.services.intro", "服務頁導言", "services", "textarea"),
  field("page.services.image", "服務頁主圖", "services", "image"),
  field("page.services.imageAlt", "服務頁主圖替代文字", "services", "textarea"),
  field("page.services.cta", "服務頁按鈕", "services"),
  field("page.ai.eyebrow", "AI 頁眉標", "ai"),
  field("page.ai.title", "AI 頁標題", "ai"),
  field("page.ai.intro", "AI 頁導言", "ai", "textarea"),
  field("page.ai.image", "AI 頁主圖", "ai", "image"),
  field("page.ai.imageAlt", "AI 頁主圖替代文字", "ai", "textarea"),
  field("page.process.eyebrow", "流程頁眉標", "process"),
  field("page.process.title", "流程頁標題", "process"),
  field("page.process.intro", "流程頁導言", "process", "textarea"),
  field("page.process.image", "流程頁主圖", "process", "image"),
  field("page.process.imageAlt", "流程頁主圖替代文字", "process", "textarea"),
  field("page.blog.eyebrow", "Blog 頁眉標", "blog"),
  field("page.blog.title", "Blog 頁標題", "blog"),
  field("page.blog.intro", "Blog 頁導言", "blog", "textarea"),
  field("page.blog.emptyTitle", "Blog 空狀態標題", "blog"),
  field("page.blog.emptyDescription", "Blog 空狀態說明", "blog", "textarea"),
  field("page.blog.readCta", "Blog 文章閱讀按鈕", "blog"),
  field("page.blog.backCta", "Blog 返回列表按鈕", "blog"),
  field("page.blog.notFoundTitle", "Blog 文章不存在提示", "blog"),
  field("page.blog.image", "Blog 頁主圖", "blog", "image"),
  field("page.blog.imageAlt", "Blog 頁主圖替代文字", "blog", "textarea"),
  field("page.about.eyebrow", "關於頁眉標", "about"),
  field("page.about.title", "關於頁標題", "about"),
  field("page.about.intro", "關於頁導言", "about", "textarea"),
  field("page.about.image", "關於頁主圖", "about", "image"),
  field("page.about.imageAlt", "關於頁主圖替代文字", "about", "textarea"),
  field("page.contact.eyebrow", "預約頁眉標", "contact"),
  field("page.contact.title", "預約頁標題", "contact"),
  field("page.contact.intro", "預約頁導言", "contact", "textarea"),
  field("page.contact.formTitle", "LINE 聯絡區標題", "contact"),
  field("page.contact.formIntro", "LINE 聯絡區說明", "contact", "textarea"),
  field("page.contact.submitCta", "預約頁 LINE 按鈕文字", "contact"),
  field("page.contact.topic.0", "預約服務主題一", "contact"),
  field("page.contact.topic.1", "預約服務主題二", "contact"),
  field("page.contact.topic.2", "預約服務主題三", "contact"),
  field("page.contact.image", "預約頁主圖", "contact", "image"),
  field("page.contact.imageAlt", "預約頁主圖替代文字", "contact", "textarea"),
  field("error.notFoundTitle", "404 頁標題", "error"),
  field("error.notFoundBack", "404 返回首頁按鈕", "error"),
];

const DEFAULT_FIELD_VALUES: Record<string, string> = {
  "global.logo": "/assets/solution-car-wrap-logo.png",
  "global.logoAlt": "Solution Car Wrap",
  "global.ksgLogo": "/assets/ksg-logo.png",
  "global.ksgLogoAlt": "KSG",
  "global.lineUrl": "",
  "global.lineLabel": "加入官方Line@",
  "global.logoButtonAria": "回到首頁",
  "global.mainNavAria": "主要導覽",
  "global.mobileNavAria": "行動版導覽",
  "global.menuOpenAria": "開啟選單",
  "global.menuCloseAria": "關閉選單",
  "global.memberLabel": "會員專區",
  "global.memberLoadingLabel": "會員狀態確認中",
  "global.headerBookingCta": "預約諮詢",
  "global.adminLinkLabel": "網站內容後台",
  "global.previewBannerLabel": "草稿預覽 · 尚未發布",
  "global.previewReturnLabel": "返回內容後台",
  "global.servicesMenuToggle": "展開服務項目",
  "global.servicesAllLabel": "查看所有服務",
  "nav.services": "服務項目",
  "nav.ai": "AI車色",
  "nav.process": "施工流程",
  "nav.blog": "Blog/改裝案例",
  "nav.about": "關於Solution",
  "nav.contact": "預約諮詢",
  "nav.member": "會員專區",

  "home.hero.eyebrow": "SURFACE INSPECTION · PRECISION AUTO CARE",
  "home.hero.titleLine1": "INSPECT THE",
  "home.hero.titleLine2": "FINISH.",
  "home.hero.description":
    "先讀懂漆面狀態，再建立合適的防護。Solution 專注汽車包膜、漆面保護膜與精緻美容。",
  "home.hero.image": "/assets/solution-hero-new.jpg",
  "home.hero.imageAlt": "深色跑車於專業施工空間中呈現車漆與保護膜的光澤",
  "home.hero.primaryCta": "探索服務",
  "home.hero.secondaryCta": "線上預覽車色",
  "home.hero.scanLabel": "LIVE SURFACE SCAN",
  "home.hero.finishLabel": "FINISH",
  "home.hero.finishValue": "STABLE",
  "home.hero.reflectionLabel": "REFLECTION",
  "home.hero.reflectionValue": "98.4%",
  "home.hero.edgeLabel": "FILM EDGE",
  "home.hero.edgeValue": "CHECKED",
  "home.hero.panelEyebrow": "READ EVERY PANEL FIRST",
  "home.hero.panelCopy": "從漆面狀態開始，再決定保護方式。",
  "home.hero.scrollAria": "向下查看服務",
  "home.servicesLinkCta": "查看服務項目",
  "home.processLinkCta": "了解施工流程",

  "about.eyebrow": "THE SOLUTION STANDARD",
  "about.intro":
    "好的保護不只抵抗環境，也應該讓每一片鈑件看起來更像它原本該有的樣子。",
  "about.titleLine1": "PROTECTION STARTS",
  "about.titleLine2": "WITH",
  "about.titleAccent": "INSPECTION.",
  "about.value.0.label": "MATERIAL",
  "about.value.0.copy": "挑選與車況相稱的膜料、塗層與工法。",
  "about.value.1.label": "PRECISION",
  "about.value.1.copy": "從邊角、收邊到反光，逐一確認完成度。",
  "about.value.2.label": "AFTERCARE",
  "about.value.2.copy": "施工完成後，提供清楚的日常養護建議。",

  "services.eyebrow": "SELECT YOUR PROTECTION",
  "services.titleLine1": "SERVICE",
  "services.titleLine2": "INDEX",
  "services.description":
    "依照車況、停車環境與用車習慣，選擇最適合的防護與整理方案。",
  "services.0.number": "01",
  "services.0.title": "汽車改色包膜",
  "services.0.english": "VINYL WRAP",
  "services.0.description":
    "從霧面、緞面到高光澤質感，讓車色成為你的風格語言，同時保留原廠車漆的完整性。",
  "services.0.detail": "全車改色・局部改色・飾件包覆",
  "services.0.image":
    "https://images.unsplash.com/photo-1503376780353-7e6692767b70?auto=format&fit=crop&w=1400&q=88",
  "services.0.imageAlt": "汽車改色包膜服務",
  "services.0.ctaAriaLabel": "諮詢汽車改色包膜",
  "services.1.number": "02",
  "services.1.title": "漆面保護膜",
  "services.1.english": "PAINT PROTECTION FILM",
  "services.1.description":
    "針對高衝擊區域與全車漆面建立透明防護層，減少日常飛石、刮痕與環境痕跡。",
  "services.1.detail": "TPU 保護膜・高衝擊區域・全車防護",
  "services.1.image":
    "https://images.unsplash.com/photo-1511919884226-fd3cad34687c?auto=format&fit=crop&w=1400&q=88",
  "services.1.imageAlt": "漆面保護膜服務",
  "services.1.ctaAriaLabel": "諮詢漆面保護膜",
  "services.2.number": "03",
  "services.2.title": "精緻汽車美容",
  "services.2.english": "DETAILING STUDIO",
  "services.2.description":
    "以漆面校正、深層清潔與鍍膜保護，將車況回復到應有的乾淨、清晰與反光層次。",
  "services.2.detail": "漆面校正・鍍膜保護・內裝深層清潔",
  "services.2.image":
    "https://images.unsplash.com/photo-1542282088-72c9c27ed0cd?auto=format&fit=crop&w=1400&q=88",
  "services.2.imageAlt": "精緻汽車美容服務",
  "services.2.ctaAriaLabel": "諮詢精緻汽車美容",

  "ai.eyebrow": "WRAP COLOR LAB / 01",
  "ai.intro":
    "上傳實車照片，從 KSG 型錄選擇色系與色號，先在線上檢視改色包膜的概念方向。",
  "ai.titleLine1": "COLOR,",
  "ai.titleLine2": "SIMULATED.",
  "ai.description":
    "線上客製化包膜車色預覽，讓你的愛車在正式施工前，先看見下一種表面狀態。",
  "ai.inputModuleLabel": "INPUT MODULE",
  "ai.inputModuleStep": "01—02",
  "ai.photo.stepLabel": "01／上傳愛車照片",
  "ai.photo.selectLabel": "選擇車輛照片",
  "ai.photo.formatHint":
    "JPG、PNG、WEBP・最大 6MB\n建議使用日間、車身完整入鏡的照片",
  "ai.photo.uploadedAlt": "待生成預覽的上傳愛車照片",
  "ai.photo.removeAriaLabel": "移除照片",
  "ai.vehicle.label": "車款／車系（選填）",
  "ai.vehicle.placeholder": "例如：Porsche Taycan 4S、BMW M3 G80",
  "ai.vehicle.help": "只用於會員紀錄與 CRM 搜尋，不會改變 AI 產圖內容。",
  "ai.catalog.stepLabel": "02／型錄色卡色號",
  "ai.catalog.countSuffix": "COLORS",
  "ai.catalog.categorySelectLabel": "選擇色系",
  "ai.catalog.colorSelectLabel": "選擇型錄色號",
  "ai.catalog.colorCountSuffix": "色",
  "ai.catalog.swatchAltSuffix": "實體材質色卡預覽",
  "ai.catalog.description":
    "型錄已依紅色系、橙色系、黃色系等 15 個色系分組。選定色號後，系統會將 PDF 的實際材質色卡一併帶入 AI，讓預覽更貼近膜料色相與金屬／珠光質感。",
  "ai.catalog.customLabel": "自訂",
  "ai.catalog.customPlaceholder": "非型錄色號可在此輸入",
  "ai.partial.stepLabel": "03／局部包膜客製化",
  "ai.partial.description": "可複選零件；每項僅提供黑化或碳纖維兩種效果。",
  "ai.partial.finishGroupSuffix": "材質選擇",
  "ai.partial.appliedPrefix": "已套用：",
  "ai.error.previewLoad": "預覽圖片讀取失敗",
  "ai.error.previewConvert": "預覽圖片無法轉換",
  "ai.error.fileType": "請上傳小於 6MB 的 JPG、PNG 或 WEBP 車輛照片。",
  "ai.error.fileRead": "照片讀取失敗，請重新選擇檔案。",
  "ai.error.fileFormat": "照片格式無法辨識，請重新上傳。",
  "ai.error.dimensions": "無法辨識照片尺寸，請重新選擇檔案。",
  "ai.error.photoRequired": "請先上傳一張清楚、可看到完整車身的愛車照片。",
  "ai.error.colorRequired": "請從型錄選擇一個色號，或輸入自訂色號。",
  "ai.auth.loginRequired": "請先登入會員",
  "ai.auth.loginRequiredDescription": "登入後才能將圖片保存 30 天。",
  "ai.toast.generateSuccess": "預覽已完成",
  "ai.toast.saved": "圖片已保存 30 天",
  "ai.toast.savedDescription": "你可以在會員專區的預覽歷史中查看。",
  "ai.toast.saveFailed": "圖片保存失敗",
  "ai.toast.historySaveWarning": "預覽已完成，但歷史紀錄暫時無法保存",
  "ai.toast.historySaveWarningDescription": "請稍後到會員專區重試。",
  "ai.toast.loginSaveDescription": "登入會員後，完成的預覽才會自動保存。",
  "ai.toast.generateFailed": "無法生成預覽",
  "ai.toast.downloadStarted": "下載已開始",
  "ai.toast.savedStatus": "已保存 30 天",
  "ai.toast.temporaryStatus": "目前暫存 3 天，按下「儲存圖片」可延長至 30 天",
  "ai.toast.previewSavedDescription": "的包膜概念預覽已完成，已暫存 3 天。",
  "ai.toast.previewDescription": "的包膜概念預覽已完成。",
  "ai.saveButton.saving": "保存中…",
  "ai.saveButton.saved": "已保存 30 天",
  "ai.saveButton.default": "儲存圖片",
  "ai.action.compare": "A｜B 比較",
  "ai.action.download": "下載圖片",
  "ai.action.regenerate": "重新生成",
  "ai.generateButton.processing": "AI 正在生成包膜預覽",
  "ai.generateButton.default": "生成車色預覽",
  "ai.output.beforeLabel": "A ORIGINAL",
  "ai.output.afterLabel": "B AI PREVIEW",
  "ai.output.compareAlt": "原始車照與 AI 車色預覽比較",
  "ai.output.imageAltPrefix": "以",
  "ai.output.generatedLabel": "CONCEPT PREVIEW GENERATED",
  "ai.output.targetLabel": "目標色號：",
  "ai.output.ratioLabel": "輸出比例：",
  "ai.output.partialLabel": "局部包膜：",
  "ai.output.materialCardLabel": "PDF MATERIAL CARD",
  "ai.output.materialCardEnabled": "實體色卡參考已啟用",
  "ai.output.materialCardHelp":
    "請在圖片外側對照色卡與車身主色；如明顯偏離，可重新生成。",
  "ai.processing.title": "PROCESSING SURFACE",
  "ai.processing.description":
    "AI 正在保留你的車型與拍攝角度，並重建指定型錄色號的包膜材質與車漆反光。",
  "ai.output.placeholderLabel": "OUTPUT PREVIEW",
  "ai.output.placeholderTitleLine1": "YOUR",
  "ai.output.placeholderTitleLine2": "NEXT",
  "ai.output.placeholderTitleLine3": "FINISH.",
  "ai.output.placeholderDescription":
    "上傳照片並從型錄選擇色號後，這裡會顯示專屬於你車輛的改色包膜概念預覽。",
  "ai.storageNotice": "按下「儲存圖片」鈕將保存 30 天，未儲存的圖片只保留 3 天",
  "ai.disclaimer":
    "此功能提供 AI 視覺概念預覽，型錄色號與螢幕呈現會受影像光線影響；實際施工前，仍應以實體包膜色樣與店內確認結果為準。",

  "process.eyebrow": "FROM FIRST LOOK TO FINAL LIGHT",
  "process.titleLine1": "BEFORE",
  "process.titleLine2": "THE FINISH.",
  "process.description":
    "從去除表面污染、確認漆面缺陷，到膜料收邊與交車後養護，每一個環節都會留下應有的完成狀態。",
  "process.0.number": "01",
  "process.0.title": "檢視",
  "process.0.description": "確認車況、使用習慣與保護目標。",
  "process.1.number": "02",
  "process.1.title": "規劃",
  "process.1.description": "依車型與預算建議施工範圍與材質。",
  "process.2.number": "03",
  "process.2.title": "施工",
  "process.2.description": "在控溫、潔淨的工序中完成每一處細節。",
  "process.3.number": "04",
  "process.3.title": "交付",
  "process.3.description": "說明養護方式，讓完成狀態持續更久。",

  "aftercare.eyebrow": "DESIGNED FOR DAILY REALITY",
  "aftercare.titleLine1": "AFTERCARE",
  "aftercare.titleLine2": "PRESERVES",
  "aftercare.titleLine3": "THE FINISH.",
  "aftercare.description":
    "施工結束後，透過正確洗車、乾燥與養護週期，讓膜面與漆面的光澤維持在你期待的狀態。",
  "aftercare.badge.0.label": "QUALIFIED MATERIALS",
  "aftercare.badge.1.label": "CONTROLLED WORKFLOW",
  "aftercare.badge.2.label": "CARE GUIDANCE",

  "contact.eyebrow": "SCHEDULE A SURFACE REVIEW",
  "contact.titleLine1": "CHECK THE",
  "contact.titleLine2": "FINISH",
  "contact.titleLine3": "FIRST.",
  "contact.description":
    "告訴我們車型、漆面狀態與停車情境。從保護範圍、膜料選擇到交車後養護，我們會先完成一份清楚的施工建議。",
  "contact.primaryCta": "預約車況檢視",
  "contact.bookingToastTitle": "官方 LINE 連結尚未設定",
  "contact.bookingToastDescription":
    "請於後台設定官方 LINE@ 連結後，點擊綠色按鈕即可直接聯絡我們。",

  "footer.descriptionLine1": "汽車包膜・漆面保護膜・精緻汽車美容",
  "footer.descriptionLine2": "以細節與工序打磨每一次交付。",
  "footer.logoAlt": "Solution Car Wrap",
  "footer.copyright": "© 2026 SOLUTION AUTOMOTIVE STUDIO",
  "footer.credit": "CRAFTED WITH INTENT · TAIWAN",

  "page.services.eyebrow": "SERVICE INDEX",
  "page.services.title": "服務項目",
  "page.services.intro":
    "依照車況、停車環境與使用習慣，為你的車選擇合適的包膜、漆面保護與美容方案。",
  "page.services.image":
    "https://images.unsplash.com/photo-1503376780353-7e6692767b70?auto=format&fit=crop&w=1600&q=88",
  "page.services.imageAlt": "Solution 汽車包膜與漆面保護服務",
  "page.services.cta": "預約諮詢",
  "page.ai.eyebrow": "WRAP COLOR LAB",
  "page.ai.title": "AI 車色預覽",
  "page.ai.intro":
    "上傳愛車照片，先用型錄色號看見改色包膜的概念方向，再與現場材質和施工建議一起確認。",
  "page.ai.image": "/assets/solution-hero-midnight.jpg",
  "page.ai.imageAlt": "專業施工空間中的車輛表面與包膜光澤",
  "page.process.eyebrow": "FROM FIRST LOOK TO FINAL LIGHT",
  "page.process.title": "施工流程",
  "page.process.intro":
    "從第一次檢視到交車後養護，每一個步驟都以可確認、可維持的完成狀態為目標。",
  "page.process.image":
    "https://images.unsplash.com/photo-1542282088-72c9c27ed0cd?auto=format&fit=crop&w=1600&q=88",
  "page.process.imageAlt": "汽車美容施工中的車輛表面",
  "page.blog.eyebrow": "BLOG / CASE INDEX",
  "page.blog.title": "Blog／改裝案例",
  "page.blog.intro":
    "記錄材質選擇、施工觀察與日常養護，讓每一次表面決策都有清楚的參考。",
  "page.blog.emptyTitle": "案例內容準備中",
  "page.blog.emptyDescription": "正式案例與施工紀錄上線後，會在這裡持續更新。",
  "page.blog.readCta": "閱讀文章",
  "page.blog.backCta": "返回 Blog／改裝案例",
  "page.blog.notFoundTitle": "找不到這篇文章",
  "page.blog.image": "/assets/solution-hero-midnight.jpg",
  "page.blog.imageAlt": "Solution 汽車表面施工細節",
  "page.about.eyebrow": "THE SOLUTION STANDARD",
  "page.about.title": "關於 Solution",
  "page.about.intro":
    "好的保護始於理解車況，並在材料、精度與養護之間建立長期可靠的標準。",
  "page.about.image":
    "https://images.unsplash.com/photo-1511919884226-fd3cad34687c?auto=format&fit=crop&w=1600&q=88",
  "page.about.imageAlt": "車輛漆面在光線下呈現細緻反光",
  "page.contact.eyebrow": "SCHEDULE A SURFACE REVIEW",
  "page.contact.title": "預約諮詢",
  "page.contact.intro":
    "告訴我們車型、使用情境與想達成的表面狀態，我們會先從車況檢視開始，整理適合的施工方向。",
  "page.contact.formTitle": "加入官方 LINE@",
  "page.contact.formIntro":
    "透過 LINE 提供車型、使用情境與想達到的表面狀態，我們會先整理適合的施工方向。",
  "page.contact.submitCta": "加入官方Line@",
  "page.contact.topic.0": "汽車包膜／改色",
  "page.contact.topic.1": "漆面保護膜",
  "page.contact.topic.2": "精緻汽車美容",
  "page.contact.image":
    "https://images.unsplash.com/photo-1503376780353-7e6692767b70?auto=format&fit=crop&w=1600&q=88",
  "page.contact.imageAlt": "Solution 汽車包膜預約諮詢",
  "error.notFoundTitle": "PAGE NOT FOUND",
  "error.notFoundBack": "回到首頁",
};

const KNOWN_FIELD_KEYS = new Set(CONTENT_FIELDS.map(item => item.key));
if (KNOWN_FIELD_KEYS.size !== CONTENT_FIELDS.length) {
  throw new Error("CONTENT_FIELDS contains duplicate keys");
}

function createDefaultFields(): Record<string, string> {
  const unknownDefaults = Object.keys(DEFAULT_FIELD_VALUES).filter(
    key => !KNOWN_FIELD_KEYS.has(key)
  );
  if (unknownDefaults.length > 0) {
    throw new Error(
      `Default content contains unknown fields: ${unknownDefaults.join(", ")}`
    );
  }

  const fields: Record<string, string> = {};
  for (const definition of CONTENT_FIELDS) {
    const value = DEFAULT_FIELD_VALUES[definition.key];
    if (typeof value !== "string") {
      throw new Error(`Missing default content field: ${definition.key}`);
    }
    fields[definition.key] = value;
  }
  return fields;
}

function deepFreeze<T>(value: T): T {
  if (value && typeof value === "object" && !Object.isFrozen(value)) {
    for (const child of Object.values(value as Record<string, unknown>)) {
      deepFreeze(child);
    }
    Object.freeze(value);
  }
  return value;
}

export const DEFAULT_SITE_CONTENT: SiteContent = deepFreeze({
  schemaVersion: 1 as const,
  fields: createDefaultFields(),
  posts: [],
});

const MAX_TEXT_LENGTH = 10_000;
const MAX_DOCUMENT_BYTES = 500_000;
const MAX_POSTS = 100;
const MAX_ID_LENGTH = 128;
const MAX_SLUG_LENGTH = 120;
const POST_KEYS = new Set([
  "id",
  "slug",
  "title",
  "category",
  "summary",
  "body",
  "image",
  "published",
  "date",
]);

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function assertText(
  value: unknown,
  label: string,
  max = MAX_TEXT_LENGTH
): asserts value is string {
  if (typeof value !== "string") {
    throw new Error(`${label} must be a string`);
  }
  if (value.length > max) {
    throw new Error(`${label} exceeds the ${max}-character limit`);
  }
  if (value.includes("\u0000")) {
    throw new Error(`${label} contains an invalid character`);
  }
}

function isSafeRelativeImageUrl(value: string): boolean {
  if (!value || value.startsWith("//") || /[\u0000-\u0020\\]/.test(value)) {
    return false;
  }
  if (/^[a-z][a-z\d+.-]*:/i.test(value)) {
    return false;
  }
  const path = value.split(/[?#]/, 1)[0];
  return (
    path.length > 0 &&
    !path.split("/").some(segment => segment === "." || segment === "..")
  );
}

function isSafeHttpsImageUrl(value: string): boolean {
  if (!value.startsWith("https://") || /[\u0000-\u0020\\]/.test(value)) {
    return false;
  }
  try {
    const url = new URL(value);
    return (
      url.protocol === "https:" &&
      url.hostname.length > 0 &&
      !url.username &&
      !url.password
    );
  } catch {
    return false;
  }
}

function assertImageUrl(
  value: unknown,
  label: string
): asserts value is string {
  assertText(value, label);
  if (value === "") return;
  if (!isSafeRelativeImageUrl(value) && !isSafeHttpsImageUrl(value)) {
    throw new Error(`${label} must be a safe relative path or HTTPS image URL`);
  }
}

function assertLineUrl(value: unknown, label: string): asserts value is string {
  assertText(value, label, 2_048);
  if (value === "") return;
  if (/[\u0000-\u0020\\]/.test(value)) {
    throw new Error(`${label} contains invalid URL characters`);
  }
  try {
    const url = new URL(value);
    const isAllowedHost =
      (url.hostname === "line.me" && url.pathname.length > 1) ||
      (url.hostname === "lin.ee" && url.pathname.length > 1) ||
      (url.hostname === "liff.line.me" && url.pathname.length > 1);
    if (
      url.protocol !== "https:" ||
      !isAllowedHost ||
      url.username ||
      url.password
    ) {
      throw new Error(`${label} must use an approved LINE HTTPS URL`);
    }
  } catch (error) {
    if (error instanceof Error && error.message.includes("approved LINE")) {
      throw error;
    }
    throw new Error(`${label} must use an approved LINE HTTPS URL`);
  }
}

function assertDocumentSize(value: unknown): void {
  let serialized: string;
  try {
    serialized = JSON.stringify(value);
  } catch {
    throw new Error("Site content must be JSON-serializable");
  }
  const bytes =
    typeof TextEncoder === "undefined"
      ? serialized.length
      : new TextEncoder().encode(serialized).byteLength;
  if (bytes > MAX_DOCUMENT_BYTES) {
    throw new Error(
      `Site content exceeds the ${MAX_DOCUMENT_BYTES}-byte limit`
    );
  }
}

function assertExactKeys(
  record: Record<string, unknown>,
  allowed: Set<string>,
  label: string
): void {
  for (const key of Object.keys(record)) {
    if (!allowed.has(key)) {
      throw new Error(`${label} contains unknown field: ${key}`);
    }
  }
}

function cloneAndValidatePost(value: unknown, index: number): BlogPost {
  const label = `posts[${index}]`;
  if (!isRecord(value)) throw new Error(`${label} must be an object`);
  assertExactKeys(value, POST_KEYS, label);
  POST_KEYS.forEach(key => {
    if (!Object.prototype.hasOwnProperty.call(value, key)) {
      throw new Error(`${label}.${key} is required`);
    }
  });
  assertText(value.id, `${label}.id`, MAX_ID_LENGTH);
  if (!/^[A-Za-z0-9][A-Za-z0-9_-]{0,127}$/.test(value.id)) {
    throw new Error(`${label}.id must be a safe generated identifier`);
  }
  assertText(value.slug, `${label}.slug`, MAX_SLUG_LENGTH);
  if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(value.slug)) {
    throw new Error(
      `${label}.slug must contain only lowercase ASCII letters, numbers, and hyphens`
    );
  }
  assertText(value.title, `${label}.title`);
  assertText(value.category, `${label}.category`);
  assertText(value.summary, `${label}.summary`);
  assertText(value.body, `${label}.body`);
  assertImageUrl(value.image, `${label}.image`);
  if (typeof value.published !== "boolean") {
    throw new Error(`${label}.published must be a boolean`);
  }
  assertText(value.date, `${label}.date`, 128);
  return {
    id: value.id,
    slug: value.slug,
    title: value.title,
    category: value.category,
    summary: value.summary,
    body: value.body,
    image: value.image,
    published: value.published,
    date: value.date,
  };
}

/**
 * Validate untrusted CMS data and return a detached, immutable copy. No HTML is
 * interpreted here; consumers must render post body and field values as text.
 */
export function validateSiteContent(value: unknown): SiteContent {
  assertDocumentSize(value);
  if (!isRecord(value)) throw new Error("Site content must be an object");
  assertExactKeys(
    value,
    new Set(["schemaVersion", "fields", "posts"]),
    "site content"
  );
  if (value.schemaVersion !== 1) {
    throw new Error("Unsupported site content schema version");
  }
  if (!isRecord(value.fields))
    throw new Error("Site content fields must be an object");
  assertExactKeys(value.fields, KNOWN_FIELD_KEYS, "site content fields");

  const fields: Record<string, string> = {};
  for (const definition of CONTENT_FIELDS) {
    if (!Object.prototype.hasOwnProperty.call(value.fields, definition.key)) {
      throw new Error(`Missing required site content field: ${definition.key}`);
    }
    const fieldValue = value.fields[definition.key];
    if (definition.type === "image") {
      assertImageUrl(fieldValue, definition.key);
    } else if (definition.type === "url") {
      assertLineUrl(fieldValue, definition.key);
    } else {
      assertText(fieldValue, definition.key);
    }
    fields[definition.key] = fieldValue;
  }

  if (!Array.isArray(value.posts))
    throw new Error("Site content posts must be an array");
  if (value.posts.length > MAX_POSTS) {
    throw new Error(`Site content supports at most ${MAX_POSTS} posts`);
  }
  const slugs = new Set<string>();
  const posts = value.posts.map((post, index) => {
    const safePost = cloneAndValidatePost(post, index);
    if (slugs.has(safePost.slug)) {
      throw new Error(`Duplicate blog post slug: ${safePost.slug}`);
    }
    slugs.add(safePost.slug);
    return safePost;
  });

  return deepFreeze({ schemaVersion: 1 as const, fields, posts });
}
