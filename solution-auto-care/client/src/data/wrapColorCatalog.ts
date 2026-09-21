/**
 * 由使用者提供的「20260804改色色卡全.pdf」整理而成。
 * 色號依 PDF 的分類扉頁分組；swatch 來自對應色卡頁的近似主色，僅用於 UI 識別。
 */
export type WrapColor = {
  code: string;
  category: string;
  categoryEn: string;
  name: string;
  nameZh: string;
  swatch: string;
  page: number;
};

export const WRAP_COLOR_CATALOG: WrapColor[] = [
  {
    "code": "KRC124F",
    "category": "紅色系",
    "categoryEn": "Red",
    "name": "",
    "nameZh": "",
    "swatch": "#dd1703",
    "page": 3
  },
  {
    "code": "KSR110P",
    "category": "紅色系",
    "categoryEn": "Red",
    "name": "",
    "nameZh": "",
    "swatch": "#c51d27",
    "page": 4
  },
  {
    "code": "SLM169",
    "category": "紅色系",
    "categoryEn": "Red",
    "name": "",
    "nameZh": "",
    "swatch": "#a01811",
    "page": 5
  },
  {
    "code": "KRS111P",
    "category": "紅色系",
    "categoryEn": "Red",
    "name": "",
    "nameZh": "",
    "swatch": "#7c1744",
    "page": 6
  },
  {
    "code": "KCR100T",
    "category": "紅色系",
    "categoryEn": "Red",
    "name": "",
    "nameZh": "",
    "swatch": "#6b1516",
    "page": 7
  },
  {
    "code": "KMM120P",
    "category": "紅色系",
    "categoryEn": "Red",
    "name": "Mahogany Metallic",
    "nameZh": "TPU桃紅木",
    "swatch": "#462b2a",
    "page": 8
  },
  {
    "code": "KDC135R",
    "category": "紅色系",
    "categoryEn": "Red",
    "name": "Deep Carnelian",
    "nameZh": "TPU深瑪瑙",
    "swatch": "#372d2e",
    "page": 9
  },
  {
    "code": "GMM230",
    "category": "紅色系",
    "categoryEn": "Red",
    "name": "",
    "nameZh": "",
    "swatch": "#987275",
    "page": 10
  },
  {
    "code": "GMN298",
    "category": "紅色系",
    "categoryEn": "Red",
    "name": "",
    "nameZh": "",
    "swatch": "#725757",
    "page": 11
  },
  {
    "code": "GUD258",
    "category": "紅色系",
    "categoryEn": "Red",
    "name": "",
    "nameZh": "",
    "swatch": "#72676b",
    "page": 12
  },
  {
    "code": "KVC148DB",
    "category": "橙色系",
    "categoryEn": "Orange",
    "name": "Vibrant Coral",
    "nameZh": "珊瑚橘",
    "swatch": "#edd0cc",
    "page": 14
  },
  {
    "code": "KMO123M",
    "category": "橙色系",
    "categoryEn": "Orange",
    "name": "",
    "nameZh": "",
    "swatch": "#febb0a",
    "page": 15
  },
  {
    "code": "SRO162",
    "category": "橙色系",
    "categoryEn": "Orange",
    "name": "",
    "nameZh": "",
    "swatch": "#e96226",
    "page": 16
  },
  {
    "code": "KLO112P",
    "category": "橙色系",
    "categoryEn": "Orange",
    "name": "",
    "nameZh": "",
    "swatch": "#cb2d16",
    "page": 17
  },
  {
    "code": "GRO318",
    "category": "橙色系",
    "categoryEn": "Orange",
    "name": "",
    "nameZh": "",
    "swatch": "#bb7a52",
    "page": 18
  },
  {
    "code": "GUB243",
    "category": "橙色系",
    "categoryEn": "Orange",
    "name": "",
    "nameZh": "",
    "swatch": "#e6a866",
    "page": 19
  },
  {
    "code": "SSG179",
    "category": "黃色系",
    "categoryEn": "Yellow",
    "name": "",
    "nameZh": "",
    "swatch": "#efe1c7",
    "page": 21
  },
  {
    "code": "KDS140MB",
    "category": "黃色系",
    "categoryEn": "Yellow",
    "name": "Desert Sand",
    "nameZh": "沙漠黃",
    "swatch": "#c7ab7d",
    "page": 22
  },
  {
    "code": "KSY113P",
    "category": "黃色系",
    "categoryEn": "Yellow",
    "name": "",
    "nameZh": "",
    "swatch": "#e6c601",
    "page": 23
  },
  {
    "code": "GMR245",
    "category": "黃色系",
    "categoryEn": "Yellow",
    "name": "",
    "nameZh": "",
    "swatch": "#e3cf60",
    "page": 24
  },
  {
    "code": "GMD273",
    "category": "黃色系",
    "categoryEn": "Yellow",
    "name": "",
    "nameZh": "",
    "swatch": "#ccd0bd",
    "page": 25
  },
  {
    "code": "GMG302",
    "category": "黃色系",
    "categoryEn": "Yellow",
    "name": "",
    "nameZh": "",
    "swatch": "#cdc7a1",
    "page": 26
  },
  {
    "code": "SDG193",
    "category": "綠色系",
    "categoryEn": "Green",
    "name": "",
    "nameZh": "",
    "swatch": "#e8e7ed",
    "page": 28
  },
  {
    "code": "KSG132R",
    "category": "綠色系",
    "categoryEn": "Green",
    "name": "",
    "nameZh": "",
    "swatch": "#b6e5e6",
    "page": 29
  },
  {
    "code": "KSG116P",
    "category": "綠色系",
    "categoryEn": "Green",
    "name": "",
    "nameZh": "",
    "swatch": "#62838d",
    "page": 30
  },
  {
    "code": "SAG167",
    "category": "綠色系",
    "categoryEn": "Green",
    "name": "",
    "nameZh": "",
    "swatch": "#c7edde",
    "page": 31
  },
  {
    "code": "KMG114P",
    "category": "綠色系",
    "categoryEn": "Green",
    "name": "",
    "nameZh": "",
    "swatch": "#6ad8d2",
    "page": 32
  },
  {
    "code": "SRG181",
    "category": "綠色系",
    "categoryEn": "Green",
    "name": "",
    "nameZh": "",
    "swatch": "#07a792",
    "page": 33
  },
  {
    "code": "SG180",
    "category": "綠色系",
    "categoryEn": "Green",
    "name": "",
    "nameZh": "",
    "swatch": "#8e9686",
    "page": 34
  },
  {
    "code": "KMG118P",
    "category": "綠色系",
    "categoryEn": "Green",
    "name": "Mamba Green",
    "nameZh": "曼巴綠",
    "swatch": "#788e55",
    "page": 35
  },
  {
    "code": "KAG117P",
    "category": "綠色系",
    "categoryEn": "Green",
    "name": "",
    "nameZh": "",
    "swatch": "#306955",
    "page": 36
  },
  {
    "code": "KVF125F",
    "category": "綠色系",
    "categoryEn": "Green",
    "name": "Verde Francesca",
    "nameZh": "TPU弗朗西絲卡綠",
    "swatch": "#96bcba",
    "page": 37
  },
  {
    "code": "KBG1500B",
    "category": "綠色系",
    "categoryEn": "Green",
    "name": "Hardly Green",
    "nameZh": "哈德林綠",
    "swatch": "#a3b5bd",
    "page": 38
  },
  {
    "code": "SSO160M",
    "category": "綠色系",
    "categoryEn": "Green",
    "name": "Satin Olive Green",
    "nameZh": "TPU緞面橄欖綠",
    "swatch": "#677b7f",
    "page": 39
  },
  {
    "code": "KFG101T",
    "category": "綠色系",
    "categoryEn": "Green",
    "name": "",
    "nameZh": "",
    "swatch": "#1f3b39",
    "page": 40
  },
  {
    "code": "KME141MB",
    "category": "綠色系",
    "categoryEn": "Green",
    "name": "Metallic Emerald",
    "nameZh": "TPU祖母石綠",
    "swatch": "#212f34",
    "page": 41
  },
  {
    "code": "SGM187",
    "category": "綠色系",
    "categoryEn": "Green",
    "name": "Gloss Mimosa Red",
    "nameZh": "星空草綠妃紅",
    "swatch": "#287161",
    "page": 42
  },
  {
    "code": "KDE127B",
    "category": "綠色系",
    "categoryEn": "Green",
    "name": "",
    "nameZh": "",
    "swatch": "#254042",
    "page": 43
  },
  {
    "code": "SMM163",
    "category": "綠色系",
    "categoryEn": "Green",
    "name": "",
    "nameZh": "",
    "swatch": "#173a47",
    "page": 44
  },
  {
    "code": "KBR156MN",
    "category": "綠色系",
    "categoryEn": "Green",
    "name": "British Racing Green",
    "nameZh": "英倫綠",
    "swatch": "#0f424a",
    "page": 45
  },
  {
    "code": "KMS226LB",
    "category": "綠色系",
    "categoryEn": "Green",
    "name": "Matte STO Gold Green",
    "nameZh": "啞面 STO 金綠(蘭博基尼)",
    "swatch": "#a8d084",
    "page": 46
  },
  {
    "code": "GMC246",
    "category": "綠色系",
    "categoryEn": "Green",
    "name": "",
    "nameZh": "",
    "swatch": "#6c7a6c",
    "page": 47
  },
  {
    "code": "GSK236",
    "category": "綠色系",
    "categoryEn": "Green",
    "name": "",
    "nameZh": "",
    "swatch": "#859389",
    "page": 48
  },
  {
    "code": "GMM238",
    "category": "綠色系",
    "categoryEn": "Green",
    "name": "",
    "nameZh": "",
    "swatch": "#5d615a",
    "page": 49
  },
  {
    "code": "GSG271",
    "category": "綠色系",
    "categoryEn": "Green",
    "name": "",
    "nameZh": "",
    "swatch": "#737b6e",
    "page": 50
  },
  {
    "code": "GMG250",
    "category": "綠色系",
    "categoryEn": "Green",
    "name": "",
    "nameZh": "",
    "swatch": "#8c9d95",
    "page": 51
  },
  {
    "code": "GMF251",
    "category": "綠色系",
    "categoryEn": "Green",
    "name": "",
    "nameZh": "",
    "swatch": "#617e7d",
    "page": 52
  },
  {
    "code": "GSR252",
    "category": "綠色系",
    "categoryEn": "Green",
    "name": "",
    "nameZh": "",
    "swatch": "#6b7a79",
    "page": 53
  },
  {
    "code": "GMG264",
    "category": "綠色系",
    "categoryEn": "Green",
    "name": "",
    "nameZh": "",
    "swatch": "#6b7a79",
    "page": 54
  },
  {
    "code": "GMV261",
    "category": "綠色系",
    "categoryEn": "Green",
    "name": "",
    "nameZh": "",
    "swatch": "#64706e",
    "page": 55
  },
  {
    "code": "GKG315",
    "category": "綠色系",
    "categoryEn": "Green",
    "name": "",
    "nameZh": "",
    "swatch": "#a7a79c",
    "page": 56
  },
  {
    "code": "GOG323",
    "category": "綠色系",
    "categoryEn": "Green",
    "name": "",
    "nameZh": "",
    "swatch": "#6d7c74",
    "page": 57
  },
  {
    "code": "GUL239",
    "category": "綠色系",
    "categoryEn": "Green",
    "name": "",
    "nameZh": "",
    "swatch": "#768475",
    "page": 58
  },
  {
    "code": "GOG204",
    "category": "綠色系",
    "categoryEn": "Green",
    "name": "",
    "nameZh": "",
    "swatch": "#919f8c",
    "page": 59
  },
  {
    "code": "GEG206",
    "category": "綠色系",
    "categoryEn": "Green",
    "name": "",
    "nameZh": "",
    "swatch": "#6e7575",
    "page": 60
  },
  {
    "code": "SDB194",
    "category": "藍色系",
    "categoryEn": "Blue",
    "name": "",
    "nameZh": "",
    "swatch": "#e5e6e8",
    "page": 62
  },
  {
    "code": "KGB128B",
    "category": "藍色系",
    "categoryEn": "Blue",
    "name": "",
    "nameZh": "",
    "swatch": "#b8e5f3",
    "page": 63
  },
  {
    "code": "KMB151DB",
    "category": "藍色系",
    "categoryEn": "Blue",
    "name": "Mako Blue",
    "nameZh": "TPU鯊魚藍",
    "swatch": "#becedd",
    "page": 64
  },
  {
    "code": "SLM170",
    "category": "藍色系",
    "categoryEn": "Blue",
    "name": "Liquid Metal Somato blue",
    "nameZh": "TPU液態金屬索瑪托藍",
    "swatch": "#a0bbce",
    "page": 65
  },
  {
    "code": "KSG157MN",
    "category": "藍色系",
    "categoryEn": "Blue",
    "name": "Sage Green",
    "nameZh": "TPU尤加利青",
    "swatch": "#5d7f91",
    "page": 66
  },
  {
    "code": "KCB142MB",
    "category": "藍色系",
    "categoryEn": "Blue",
    "name": "China Blue",
    "nameZh": "TPU瓷器藍",
    "swatch": "#568bbd",
    "page": 67
  },
  {
    "code": "KBB158LR",
    "category": "藍色系",
    "categoryEn": "Blue",
    "name": "Byron Bay Blue",
    "nameZh": "拜倫灣藍",
    "swatch": "#63758c",
    "page": 68
  },
  {
    "code": "KGB102T",
    "category": "藍色系",
    "categoryEn": "Blue",
    "name": "",
    "nameZh": "",
    "swatch": "#769abf",
    "page": 69
  },
  {
    "code": "KMB119P",
    "category": "藍色系",
    "categoryEn": "Blue",
    "name": "",
    "nameZh": "",
    "swatch": "#018bc1",
    "page": 70
  },
  {
    "code": "KMB1520B",
    "category": "藍色系",
    "categoryEn": "Blue",
    "name": "",
    "nameZh": "",
    "swatch": "#0752a8",
    "page": 71
  },
  {
    "code": "KDS136BM",
    "category": "藍色系",
    "categoryEn": "Blue",
    "name": "Danquan Stone Blue",
    "nameZh": "TPU丹泉石藍",
    "swatch": "#172b64",
    "page": 72
  },
  {
    "code": "KRI153DB",
    "category": "藍色系",
    "categoryEn": "Blue",
    "name": "Royal Indigo",
    "nameZh": "TPU皇家靛藍",
    "swatch": "#221e5b",
    "page": 73
  },
  {
    "code": "KCG143MB",
    "category": "藍色系",
    "categoryEn": "Blue",
    "name": "Carbon Gray Blue",
    "nameZh": "TPU炭灰藍",
    "swatch": "#36395a",
    "page": 74
  },
  {
    "code": "KBV134R",
    "category": "藍色系",
    "categoryEn": "Blue",
    "name": "",
    "nameZh": "",
    "swatch": "#24283c",
    "page": 75
  },
  {
    "code": "GUM244",
    "category": "藍色系",
    "categoryEn": "Blue",
    "name": "",
    "nameZh": "",
    "swatch": "#647c8b",
    "page": 76
  },
  {
    "code": "GMB305",
    "category": "藍色系",
    "categoryEn": "Blue",
    "name": "",
    "nameZh": "",
    "swatch": "#9aadb4",
    "page": 77
  },
  {
    "code": "GOB306",
    "category": "藍色系",
    "categoryEn": "Blue",
    "name": "",
    "nameZh": "",
    "swatch": "#8585dd",
    "page": 78
  },
  {
    "code": "GSS307",
    "category": "藍色系",
    "categoryEn": "Blue",
    "name": "",
    "nameZh": "",
    "swatch": "#9199a0",
    "page": 79
  },
  {
    "code": "GSB310",
    "category": "藍色系",
    "categoryEn": "Blue",
    "name": "",
    "nameZh": "",
    "swatch": "#75bed9",
    "page": 80
  },
  {
    "code": "GSA309",
    "category": "藍色系",
    "categoryEn": "Blue",
    "name": "",
    "nameZh": "",
    "swatch": "#627eaa",
    "page": 81
  },
  {
    "code": "GUL254",
    "category": "藍色系",
    "categoryEn": "Blue",
    "name": "",
    "nameZh": "",
    "swatch": "#a9c0c2",
    "page": 82
  },
  {
    "code": "GNB208",
    "category": "藍色系",
    "categoryEn": "Blue",
    "name": "",
    "nameZh": "",
    "swatch": "#556c7e",
    "page": 83
  },
  {
    "code": "GBM210",
    "category": "藍色系",
    "categoryEn": "Blue",
    "name": "",
    "nameZh": "",
    "swatch": "#8592a6",
    "page": 84
  },
  {
    "code": "SDP195",
    "category": "紫色系",
    "categoryEn": "Purple",
    "name": "",
    "nameZh": "",
    "swatch": "#dfe8e9",
    "page": 86
  },
  {
    "code": "SDP192",
    "category": "紫色系",
    "categoryEn": "Purple",
    "name": "",
    "nameZh": "",
    "swatch": "#c4d6dc",
    "page": 87
  },
  {
    "code": "SBP166",
    "category": "紫色系",
    "categoryEn": "Purple",
    "name": "",
    "nameZh": "",
    "swatch": "#f14b89",
    "page": 88
  },
  {
    "code": "SLEP201",
    "category": "紫色系",
    "categoryEn": "Purple",
    "name": "",
    "nameZh": "",
    "swatch": "#8072a0",
    "page": 89
  },
  {
    "code": "SCF186",
    "category": "紫色系",
    "categoryEn": "Purple",
    "name": "",
    "nameZh": "",
    "swatch": "#7e85af",
    "page": 90
  },
  {
    "code": "SSP182",
    "category": "紫色系",
    "categoryEn": "Purple",
    "name": "",
    "nameZh": "",
    "swatch": "#2a2241",
    "page": 91
  },
  {
    "code": "GUM228",
    "category": "紫色系",
    "categoryEn": "Purple",
    "name": "",
    "nameZh": "",
    "swatch": "#646264",
    "page": 92
  },
  {
    "code": "GMP299",
    "category": "紫色系",
    "categoryEn": "Purple",
    "name": "",
    "nameZh": "",
    "swatch": "#6f6d7d",
    "page": 93
  },
  {
    "code": "GMG300",
    "category": "紫色系",
    "categoryEn": "Purple",
    "name": "",
    "nameZh": "",
    "swatch": "#676b79",
    "page": 94
  },
  {
    "code": "GSM301",
    "category": "紫色系",
    "categoryEn": "Purple",
    "name": "",
    "nameZh": "",
    "swatch": "#747073",
    "page": 95
  },
  {
    "code": "GMP249",
    "category": "紫色系",
    "categoryEn": "Purple",
    "name": "",
    "nameZh": "",
    "swatch": "#676b79",
    "page": 96
  },
  {
    "code": "GMP232",
    "category": "紫色系",
    "categoryEn": "Purple",
    "name": "",
    "nameZh": "",
    "swatch": "#9ba5c0",
    "page": 97
  },
  {
    "code": "GV213",
    "category": "紫色系",
    "categoryEn": "Purple",
    "name": "",
    "nameZh": "",
    "swatch": "#7c728b",
    "page": 98
  },
  {
    "code": "KPW155MN",
    "category": "白色系",
    "categoryEn": "White",
    "name": "Pepper White",
    "nameZh": "TPU胡椒白",
    "swatch": "#e8e6e2",
    "page": 100
  },
  {
    "code": "SOWJ164",
    "category": "白色系",
    "categoryEn": "White",
    "name": "",
    "nameZh": "",
    "swatch": "#e6ecef",
    "page": 101
  },
  {
    "code": "SSW176",
    "category": "白色系",
    "categoryEn": "White",
    "name": "",
    "nameZh": "",
    "swatch": "#f2f6f9",
    "page": 102
  },
  {
    "code": "SSD177",
    "category": "白色系",
    "categoryEn": "White",
    "name": "Super Diamond White",
    "nameZh": "",
    "swatch": "#b9b8c4",
    "page": 103
  },
  {
    "code": "SMW165",
    "category": "白色系",
    "categoryEn": "White",
    "name": "Muriwai White",
    "nameZh": "",
    "swatch": "#a3cad5",
    "page": 104
  },
  {
    "code": "GMD281",
    "category": "白色系",
    "categoryEn": "White",
    "name": "",
    "nameZh": "",
    "swatch": "#d1dddc",
    "page": 105
  },
  {
    "code": "GMS282",
    "category": "白色系",
    "categoryEn": "White",
    "name": "",
    "nameZh": "",
    "swatch": "#d2d2cf",
    "page": 106
  },
  {
    "code": "GMO276",
    "category": "白色系",
    "categoryEn": "White",
    "name": "",
    "nameZh": "",
    "swatch": "#9ba09d",
    "page": 107
  },
  {
    "code": "GMC267",
    "category": "白色系",
    "categoryEn": "White",
    "name": "",
    "nameZh": "",
    "swatch": "#d5dfd8",
    "page": 108
  },
  {
    "code": "KSF154DB",
    "category": "灰色系",
    "categoryEn": "Grey",
    "name": "Silver Fox",
    "nameZh": "TPU銀狐灰",
    "swatch": "#e3e3e5",
    "page": 110
  },
  {
    "code": "KSC104TM",
    "category": "灰色系",
    "categoryEn": "Grey",
    "name": "Satin Ceramic White",
    "nameZh": "",
    "swatch": "#dfe2ea",
    "page": 111
  },
  {
    "code": "KSG103T",
    "category": "灰色系",
    "categoryEn": "Grey",
    "name": "",
    "nameZh": "",
    "swatch": "#bbc8d2",
    "page": 112
  },
  {
    "code": "KMG139MB",
    "category": "灰色系",
    "categoryEn": "Grey",
    "name": "Mountain Gray",
    "nameZh": "TPU山灰",
    "swatch": "#b1b6bf",
    "page": 113
  },
  {
    "code": "KSG121P",
    "category": "灰色系",
    "categoryEn": "Grey",
    "name": "",
    "nameZh": "",
    "swatch": "#9fa3a6",
    "page": 114
  },
  {
    "code": "KBG137BM",
    "category": "灰色系",
    "categoryEn": "Grey",
    "name": "Brooklyn Grey",
    "nameZh": "TPU布魯克林灰",
    "swatch": "#97a0ac",
    "page": 115
  },
  {
    "code": "KBG138BM",
    "category": "灰色系",
    "categoryEn": "Grey",
    "name": "Bernina Grey",
    "nameZh": "TPU貝爾尼納灰",
    "swatch": "#676b78",
    "page": 116
  },
  {
    "code": "KA129B",
    "category": "灰色系",
    "categoryEn": "Grey",
    "name": "Anthracite",
    "nameZh": "TPU煤炭灰",
    "swatch": "#535458",
    "page": 117
  },
  {
    "code": "KAG122P",
    "category": "灰色系",
    "categoryEn": "Grey",
    "name": "",
    "nameZh": "",
    "swatch": "#5b728a",
    "page": 118
  },
  {
    "code": "KGN147AD",
    "category": "灰色系",
    "categoryEn": "Grey",
    "name": "Gloss Nardo Grey",
    "nameZh": "TPU納多灰",
    "swatch": "#5e6c7f",
    "page": 119
  },
  {
    "code": "SCG198",
    "category": "灰色系",
    "categoryEn": "Grey",
    "name": "Capri Grey Purple",
    "nameZh": "",
    "swatch": "#42445a",
    "page": 120
  },
  {
    "code": "SPG189",
    "category": "灰色系",
    "categoryEn": "Grey",
    "name": "Phantom Grey",
    "nameZh": "TPU星空灰魅影",
    "swatch": "#637385",
    "page": 121
  },
  {
    "code": "KMB222LB",
    "category": "灰色系",
    "categoryEn": "Grey",
    "name": "Matte Battleship Grey",
    "nameZh": "消光戰艦灰(蘭博基尼)",
    "swatch": "#94adae",
    "page": 122
  },
  {
    "code": "KMS224LB",
    "category": "灰色系",
    "categoryEn": "Grey",
    "name": "Matte Shadow Knight Grey",
    "nameZh": "消光暗影騎士灰(蘭博基尼)",
    "swatch": "#6c787a",
    "page": 123
  },
  {
    "code": "GSM227",
    "category": "灰色系",
    "categoryEn": "Grey",
    "name": "",
    "nameZh": "",
    "swatch": "#737370",
    "page": 124
  },
  {
    "code": "GMS233",
    "category": "灰色系",
    "categoryEn": "Grey",
    "name": "",
    "nameZh": "",
    "swatch": "#616161",
    "page": 125
  },
  {
    "code": "GUS234",
    "category": "灰色系",
    "categoryEn": "Grey",
    "name": "",
    "nameZh": "",
    "swatch": "#93a1a0",
    "page": 126
  },
  {
    "code": "GMD240",
    "category": "灰色系",
    "categoryEn": "Grey",
    "name": "",
    "nameZh": "",
    "swatch": "#758181",
    "page": 127
  },
  {
    "code": "GUL241",
    "category": "灰色系",
    "categoryEn": "Grey",
    "name": "",
    "nameZh": "",
    "swatch": "#616161",
    "page": 128
  },
  {
    "code": "GMM288",
    "category": "灰色系",
    "categoryEn": "Grey",
    "name": "",
    "nameZh": "",
    "swatch": "#737370",
    "page": 129
  },
  {
    "code": "GMQ289",
    "category": "灰色系",
    "categoryEn": "Grey",
    "name": "",
    "nameZh": "",
    "swatch": "#97a3a2",
    "page": 130
  },
  {
    "code": "GMT290",
    "category": "灰色系",
    "categoryEn": "Grey",
    "name": "",
    "nameZh": "",
    "swatch": "#6c787a",
    "page": 131
  },
  {
    "code": "GMS291",
    "category": "灰色系",
    "categoryEn": "Grey",
    "name": "",
    "nameZh": "",
    "swatch": "#6c787a",
    "page": 132
  },
  {
    "code": "GMI294",
    "category": "灰色系",
    "categoryEn": "Grey",
    "name": "",
    "nameZh": "",
    "swatch": "#808e90",
    "page": 133
  },
  {
    "code": "GMU295",
    "category": "灰色系",
    "categoryEn": "Grey",
    "name": "",
    "nameZh": "",
    "swatch": "#6c787a",
    "page": 134
  },
  {
    "code": "GUM277",
    "category": "灰色系",
    "categoryEn": "Grey",
    "name": "",
    "nameZh": "",
    "swatch": "#828a92",
    "page": 135
  },
  {
    "code": "GSR266",
    "category": "灰色系",
    "categoryEn": "Grey",
    "name": "",
    "nameZh": "",
    "swatch": "#8c938d",
    "page": 136
  },
  {
    "code": "GSG312",
    "category": "灰色系",
    "categoryEn": "Grey",
    "name": "",
    "nameZh": "",
    "swatch": "#8b9fa2",
    "page": 137
  },
  {
    "code": "SSB161M",
    "category": "黑色系",
    "categoryEn": "Black",
    "name": "",
    "nameZh": "",
    "swatch": "#636673",
    "page": 139
  },
  {
    "code": "KSS105TM",
    "category": "黑色系",
    "categoryEn": "Black",
    "name": "Satin Stealth Black",
    "nameZh": "",
    "swatch": "#7a7879",
    "page": 140
  },
  {
    "code": "KBK133R",
    "category": "黑色系",
    "categoryEn": "Black",
    "name": "",
    "nameZh": "",
    "swatch": "#1c1c1d",
    "page": 141
  },
  {
    "code": "KLC131R",
    "category": "黑色系",
    "categoryEn": "Black",
    "name": "",
    "nameZh": "",
    "swatch": "#181c1e",
    "page": 142
  },
  {
    "code": "KSB159LR",
    "category": "黑色系",
    "categoryEn": "Black",
    "name": "Santorini Black",
    "nameZh": "TPU聖托里尼黑",
    "swatch": "#22252a",
    "page": 143
  },
  {
    "code": "KOB146MB",
    "category": "黑色系",
    "categoryEn": "Black",
    "name": "Obsidian Black",
    "nameZh": "TPU曜岩黑",
    "swatch": "#24272a",
    "page": 144
  },
  {
    "code": "SCB191",
    "category": "黑色系",
    "categoryEn": "Black",
    "name": "",
    "nameZh": "",
    "swatch": "#23252f",
    "page": 145
  },
  {
    "code": "SCB190",
    "category": "黑色系",
    "categoryEn": "Black",
    "name": "",
    "nameZh": "",
    "swatch": "#202126",
    "page": 146
  },
  {
    "code": "SSB183",
    "category": "黑色系",
    "categoryEn": "Black",
    "name": "",
    "nameZh": "",
    "swatch": "#15191d",
    "page": 147
  },
  {
    "code": "GUB229",
    "category": "黑色系",
    "categoryEn": "Black",
    "name": "",
    "nameZh": "",
    "swatch": "#797c7c",
    "page": 148
  },
  {
    "code": "GSI265",
    "category": "黑色系",
    "categoryEn": "Black",
    "name": "",
    "nameZh": "",
    "swatch": "#797c7c",
    "page": 149
  },
  {
    "code": "GSB321",
    "category": "黑色系",
    "categoryEn": "Black",
    "name": "",
    "nameZh": "",
    "swatch": "#5e5f5d",
    "page": 150
  },
  {
    "code": "GCB322",
    "category": "黑色系",
    "categoryEn": "Black",
    "name": "",
    "nameZh": "",
    "swatch": "#7b8482",
    "page": 151
  },
  {
    "code": "GUB231",
    "category": "黑色系",
    "categoryEn": "Black",
    "name": "",
    "nameZh": "",
    "swatch": "#5e6a6e",
    "page": 152
  },
  {
    "code": "GMM303",
    "category": "黑色系",
    "categoryEn": "Black",
    "name": "",
    "nameZh": "",
    "swatch": "#6e7574",
    "page": 153
  },
  {
    "code": "KCG145MB",
    "category": "金色系",
    "categoryEn": "Gold",
    "name": "Champagne Gold",
    "nameZh": "TPU香檳金",
    "swatch": "#c6ccd1",
    "page": 155
  },
  {
    "code": "SDG196",
    "category": "金色系",
    "categoryEn": "Gold",
    "name": "",
    "nameZh": "",
    "swatch": "#d5deeb",
    "page": 156
  },
  {
    "code": "KML225LB",
    "category": "金色系",
    "categoryEn": "Gold",
    "name": "Matte Liquid Metal Super Gold",
    "nameZh": "消光液態金屬超級金(蘭博基尼)",
    "swatch": "#6b736b",
    "page": 157
  },
  {
    "code": "GST268",
    "category": "金色系",
    "categoryEn": "Gold",
    "name": "",
    "nameZh": "",
    "swatch": "#b6beb0",
    "page": 158
  },
  {
    "code": "GCG313",
    "category": "金色系",
    "categoryEn": "Gold",
    "name": "",
    "nameZh": "",
    "swatch": "#cee0df",
    "page": 159
  },
  {
    "code": "GMT247",
    "category": "金色系",
    "categoryEn": "Gold",
    "name": "",
    "nameZh": "",
    "swatch": "#869a9c",
    "page": 160
  },
  {
    "code": "GTG314",
    "category": "金色系",
    "categoryEn": "Gold",
    "name": "",
    "nameZh": "",
    "swatch": "#869a9c",
    "page": 161
  },
  {
    "code": "KAM130R",
    "category": "銀色系",
    "categoryEn": "Silver",
    "name": "Aquilla Metallic",
    "nameZh": "阿奎拉金屬",
    "swatch": "#bbc4c3",
    "page": 163
  },
  {
    "code": "KGS108P",
    "category": "銀色系",
    "categoryEn": "Silver",
    "name": "GT Silver",
    "nameZh": "TPU GT銀",
    "swatch": "#a1acb7",
    "page": 164
  },
  {
    "code": "SLM171",
    "category": "銀色系",
    "categoryEn": "Silver",
    "name": "Liquid Metal Silver",
    "nameZh": "液態金屬銀",
    "swatch": "#aaaaaf",
    "page": 165
  },
  {
    "code": "KGM200MB",
    "category": "銀色系",
    "categoryEn": "Silver",
    "name": "Gloss Mountain Gray",
    "nameZh": "",
    "swatch": "#474b4c",
    "page": 166
  },
  {
    "code": "KGG144MB",
    "category": "銀色系",
    "categoryEn": "Silver",
    "name": "Gloss Graphite Gray",
    "nameZh": "TPU石墨灰",
    "swatch": "#414145",
    "page": 167
  },
  {
    "code": "GML286",
    "category": "銀色系",
    "categoryEn": "Silver",
    "name": "",
    "nameZh": "",
    "swatch": "#7d7e7a",
    "page": 168
  },
  {
    "code": "GFD275",
    "category": "銀色系",
    "categoryEn": "Silver",
    "name": "",
    "nameZh": "",
    "swatch": "#8b9a99",
    "page": 169
  },
  {
    "code": "GMA283",
    "category": "銀色系",
    "categoryEn": "Silver",
    "name": "",
    "nameZh": "",
    "swatch": "#999998",
    "page": 170
  },
  {
    "code": "GLD325",
    "category": "銀色系",
    "categoryEn": "Silver",
    "name": "",
    "nameZh": "",
    "swatch": "#91918f",
    "page": 171
  },
  {
    "code": "GAS285",
    "category": "銀色系",
    "categoryEn": "Silver",
    "name": "",
    "nameZh": "",
    "swatch": "#b1bfbe",
    "page": 172
  },
  {
    "code": "GMT284",
    "category": "銀色系",
    "categoryEn": "Silver",
    "name": "",
    "nameZh": "",
    "swatch": "#b4c5c6",
    "page": 173
  },
  {
    "code": "GLM262",
    "category": "銀色系",
    "categoryEn": "Silver",
    "name": "",
    "nameZh": "",
    "swatch": "#7d7e7a",
    "page": 174
  },
  {
    "code": "GSL287",
    "category": "銀色系",
    "categoryEn": "Silver",
    "name": "",
    "nameZh": "",
    "swatch": "#a1b0b0",
    "page": 175
  },
  {
    "code": "KBP149DB",
    "category": "粉色系",
    "categoryEn": "Pink",
    "name": "Blush Pearl",
    "nameZh": "TPU胭脂珍珠粉",
    "swatch": "#dbced2",
    "page": 177
  },
  {
    "code": "KMK126B",
    "category": "粉色系",
    "categoryEn": "Pink",
    "name": "",
    "nameZh": "",
    "swatch": "#f2edf3",
    "page": 178
  },
  {
    "code": "SCP185",
    "category": "粉色系",
    "categoryEn": "Pink",
    "name": "",
    "nameZh": "",
    "swatch": "#e7d8d9",
    "page": 179
  },
  {
    "code": "KSR106TM",
    "category": "粉色系",
    "categoryEn": "Pink",
    "name": "Satin Rose Gold",
    "nameZh": "TPU緞面玫瑰金T",
    "swatch": "#dedadd",
    "page": 180
  },
  {
    "code": "SG178",
    "category": "粉色系",
    "categoryEn": "Pink",
    "name": "",
    "nameZh": "",
    "swatch": "#e2c6c8",
    "page": 181
  },
  {
    "code": "SDP184",
    "category": "粉色系",
    "categoryEn": "Pink",
    "name": "",
    "nameZh": "",
    "swatch": "#e6e6f0",
    "page": 182
  },
  {
    "code": "KFL107N",
    "category": "粉色系",
    "categoryEn": "Pink",
    "name": "",
    "nameZh": "",
    "swatch": "#bcb2b8",
    "page": 183
  },
  {
    "code": "SLM168",
    "category": "粉色系",
    "categoryEn": "Pink",
    "name": "",
    "nameZh": "",
    "swatch": "#b5929c",
    "page": 184
  },
  {
    "code": "SOM199",
    "category": "粉色系",
    "categoryEn": "Pink",
    "name": "",
    "nameZh": "",
    "swatch": "#976883",
    "page": 185
  },
  {
    "code": "KFB109P",
    "category": "粉色系",
    "categoryEn": "Pink",
    "name": "Frozen Berry Metallic",
    "nameZh": "冰莓粉",
    "swatch": "#726a72",
    "page": 186
  },
  {
    "code": "SGG188",
    "category": "粉色系",
    "categoryEn": "Pink",
    "name": "",
    "nameZh": "",
    "swatch": "#b1bedd",
    "page": 187
  },
  {
    "code": "GUM269",
    "category": "粉色系",
    "categoryEn": "Pink",
    "name": "",
    "nameZh": "",
    "swatch": "#d2cac7",
    "page": 188
  },
  {
    "code": "SLM173",
    "category": "古銅色系",
    "categoryEn": "Bronze",
    "name": "Liquid Metal Bronze",
    "nameZh": "TPU液態金屬古銅",
    "swatch": "#979690",
    "page": 190
  },
  {
    "code": "GSB256",
    "category": "古銅色系",
    "categoryEn": "Bronze",
    "name": "",
    "nameZh": "",
    "swatch": "#899389",
    "page": 191
  },
  {
    "code": "SSL174M",
    "category": "鈦鋼色系",
    "categoryEn": "Titanium",
    "name": "",
    "nameZh": "",
    "swatch": "#a1a39d",
    "page": 193
  },
  {
    "code": "SSL175M",
    "category": "鈦鋼色系",
    "categoryEn": "Titanium",
    "name": "Satin Liquid Metal Gray Tungsten Steel",
    "nameZh": "",
    "swatch": "#8d9198",
    "page": 194
  },
  {
    "code": "SLM172",
    "category": "鈦鋼色系",
    "categoryEn": "Titanium",
    "name": "",
    "nameZh": "",
    "swatch": "#59585a",
    "page": 195
  },
  {
    "code": "GET260",
    "category": "鈦鋼色系",
    "categoryEn": "Titanium",
    "name": "",
    "nameZh": "",
    "swatch": "#717371",
    "page": 196
  },
  {
    "code": "GST257",
    "category": "鈦鋼色系",
    "categoryEn": "Titanium",
    "name": "",
    "nameZh": "",
    "swatch": "#717371",
    "page": 197
  },
  {
    "code": "GTG197",
    "category": "碳纖維系列",
    "categoryEn": "Carbon Fiber",
    "name": "TPU Gloss Carbon Fiber",
    "nameZh": "TPU超亮碳纖",
    "swatch": "#464a4f",
    "page": 199
  },
  {
    "code": "GMC263",
    "category": "碳纖維系列",
    "categoryEn": "Carbon Fiber",
    "name": "",
    "nameZh": "",
    "swatch": "#6f7c7d",
    "page": 200
  }
];

export const WRAP_COLOR_CATEGORY_COUNTS: Record<string, number> = {
  "紅色系": 10,
  "橙色系": 6,
  "黃色系": 6,
  "綠色系": 33,
  "藍色系": 23,
  "紫色系": 13,
  "白色系": 9,
  "灰色系": 28,
  "黑色系": 15,
  "金色系": 7,
  "銀色系": 13,
  "粉色系": 12,
  "古銅色系": 2,
  "鈦鋼色系": 5,
  "碳纖維系列": 2
};
