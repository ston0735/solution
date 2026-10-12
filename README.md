# 車色 3D 配置器

用 Three.js 做的 3D 車輛外觀配置器。可以 360° 檢視車款，自訂車身顏色、漆面質感、輪圈、煞車卡鉗、後視鏡與燈組，並支援 Pantone 色票與自訂色碼。

純靜態網站：一個 `index.html` 加上 `models/` 資料夾，不需要建置步驟。

## 檔案結構

```
index.html        主程式（介面、3D 場景、部位辨識）
models/           內建車款 .glb，以及預設部位設定 *.parts.json
vercel.json       Vercel 設定（模型檔快取與檔案類型）
```

> 718 Spyder 使用未壓縮的原始檔，光影細節最完整；其他車款是壓縮過的版本（載入較快）。
> 想換回原始檔，直接用原檔覆蓋 `models/` 裡同名的 .glb 即可（換檔後，該車款舊的部位修正需要重新設定）。

## 在自己電腦上測試

直接雙擊 `index.html` 打不開內建車款（瀏覽器不允許本機檔案互相讀取），請用本機伺服器：

```bash
npx serve .
```

然後打開終端機顯示的網址（通常是 http://localhost:3000）。

## 新增車款

1. 把 `.glb` 放進 `models/`，檔名用英文，例如 `models/turbo75.glb`。
2. 在 `index.html` 搜尋 `const MODELS`，加一行：
   ```js
   {id:'turbo75', name:'1975 Porsche 911 Turbo', credit:{author:'作者', license:'授權', url:'來源網址'}},
   ```
   `id` 要和檔名一致。
3. 檔案太大時可用 [gltfpack](https://github.com/zeux/meshoptimizer) 壓縮：`gltfpack -i 原檔.glb -o models/xxx.glb -kn -km -ke`

## 存檔

右側「我的存檔」可以把目前的車款、部位設定和所有顏色存成一組，取個名字就好（同名會覆蓋）。
存檔放在瀏覽器裡，清除瀏覽器資料或換瀏覽器就看不到，需要帶走時用「分享連結」。

## 分享給別人

按畫面右上角「分享連結」→「複製」，把連結傳給對方。連結裡包含車款、部位對應和所有顏色選項，
對方打開就會看到同樣的樣子，不需要匯入任何東西。之後你再修改，要重新分享一次新連結。

## 部位設定（換網址也能帶著走）

部位修正存在瀏覽器裡，而且跟著網址走，所以換網址就看不到。要帶到別的地方：

1. 在原本的網址打開那台車，按右側「匯出設定」→「複製」。
2. 在新網址打開同一台車，按「匯入設定」→ 貼上 →「套用」。

要讓所有人一打開就是正確設定，把匯出的內容存成 `models/<車款 id>.parts.json`（例如 `models/etrongt.parts.json`），
上傳到倉庫即可。沒有個人修正的瀏覽器會自動套用這份預設。

## 模型授權

| 車款 | 作者 | 授權 |
|---|---|---|
| 2022 Porsche 911 GT3 Touring | Ddiaz Design | CC BY-NC-SA 4.0 |
| 2023 Ferrari Purosangue | Ddiaz Design | CC BY-NC-SA 4.0 |
| 2020 Porsche 718 Spyder | Ddiaz Design | CC BY-NC-SA 4.0 |
| 2021 Porsche Taycan Turbo S | VückyZ（擷取自遊戲 Project Cars 3） | 標示 CC BY 4.0 |
| 2021 Audi e-tron GT | 檔案未標示 | 未知 |

CC BY-NC-SA 不允許商業使用；公開散布時須標示作者並以相同授權分享。
