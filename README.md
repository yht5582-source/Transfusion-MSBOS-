# 輸血與術前備血決策輔助 v2.5.1

繁體中文、無外部依賴、可離線單頁成人教育／研究工具。**臨床決策輔助，不能取代醫師判斷；未經臨床驗證，不得當作醫療器材或自動醫囑。**

## 網站

https://yht5582-source.github.io/Transfusion-MSBOS-/

儲存庫名稱最後有 `-`。2026-11-03 查核原對話無可取回之 HTML 附件；儲存庫起始只有 README/LICENSE，因此本版是重建，不宣稱已保留前版完整 HTML 或 60 餘術式表。

## 使用

開啟 `index.html`，或使用 HTTPS 網址。在手機請以正式瀏覽器開啟；某些附件預覽不執行互動程式。

1. 選成人重大出血、創傷、一般術中或產科情境；標示出血／休克及複雜病因。
2. 新增各時間點，以起始後分鐘輸入**累積已完成** RBC、FFP、PLT 成人量、輸液、失血及 fibrinogen 實際克數。不要將累積量誤填增量。
3. 只輸入該採樣時間實測的項目，未測留白。PT、aPTT 填秒數並填同次報告的 MNPT、MNAPTT，由工具計算倍數（NBA 原文以 ULN 為分母，MN 會較早提示）。TEG/ROTEM 使用完整儀器、試劑、原值、單位與人工判讀。
4. 觀察逐項最後實測採樣時間及警訊；未来欄位是**額外增量**。血小板與 fibrinogen 只提供機制敏感度範圍；其他項目不作數值外推。
5. 高風險或重大出血由臨床團隊評估 MTP、立即止血、重複檢驗與目標導向血品補充，不等待模型。清空／重整即刪除記憶體內資料。

## 模型與安全邊界

詳細公式、血容量／液體留存／回收率／消耗假設與停止外推條件均見網站「指引與模型」及 `docs/design.md`。32 組參數角點產生的包絡不是信賴區間或經驗證之個人預測；真值可能完全超出範圍。模型未描述完整凝血生理、同區間補充先後順序或輸血反應。

- 每個檢驗各自追蹤時間與錨點，缺失不補成正常、零或本次實測。
- 台灣 RBC 重測量可調（預設 4 台灣 U，屬工具保守提醒，不是 NBA 海外 4 U 換算）；30 分鐘時效亦為可調工具假設。
- 「血品引導」依適應症列出參考劑量與術前預備血量，由醫師決定，不生成處方；冷沉澱需由血庫換算 g。
- 原術式表無法取回；v2.2 重建 68 項官方來源參考記錄（JHU 36、HTAA 32），支援搜尋／科別篩選／選取，與人工核定本院方案分開；此查詢表保留原文，不換算台灣 RBC U。v2.3 另有 8 份來源的比對表與工具綜整建議值（見下）。
- 無姓名／病歷號欄位、遠端 API、分析追蹤、資料庫或自動儲存；教學資料全為合成。不輸入可識別病人資料。
- 未做臨床效度驗證；院內使用前需血庫、麻醉、急診、醫師及輸血委員會審核。台灣仿單、給付及院內政策待核定。

## 指引查核：2026-11-03

- [NBA 成人重大出血 2023；2025-09-04 更新](https://www.blood.gov.au/patient-blood-management-guideline-adults-critical-bleeding)：官方現標示修訂中。
- [European trauma 第六版 2023](https://link.springer.com/article/10.1186/s13054-023-04327-7)
- [Association of Anaesthetists 2025](https://associationofanaesthetists-publications.onlinelibrary.wiley.com/doi/10.1111/anae.16542)
- [AABB 2023 RBC](https://www.isbtweb.org/resource/red-blood-cell-transfusion-2023-aabb-international-guidelines.html)
- [AABB 2025 AMI](https://www.aabb.org/news-resources/news/article/2025/08/20/expert-panel-recommends-liberal-transfusion-strategy-for-hospitalized-patients-with-ami)
- [ISTH 2026 官方發布清單](https://www.isth.org/page/Published_Guidance)：確認已發布 `10.1016/j.jtha.2026.07.030`，全文受限，未以未讀取全文制定規則。

## 建置與檢查

```
python3 build.py
node --test tests/*.cjs
```

`src/core.js`：純邏輯；`src/app.js`：操作；`src/template.html`：內容；`src/style.css`：版面。建置輸出 `index.html` 內嵌所有資源，可直接下載開啟。測試涵蓋不同情境閾值、缺失、無效輸入、時間、累積量、重測、錨定、模型停止條件及品質指標；軟體測試不代表臨床驗證。

程式授權見 LICENSE；NBA 衍生臨床摘要歸屬見 NOTICE.md。

## v2.2 術式表修正（2026-11-03）

前版未載入術式資料，只提供自由填寫欄位。現新增 `src/msbos.js` 資料及純搜尋邏輯，顯示 68 項具來源之參考記錄。每項標示來源版本及段落／原文印刷頁碼；選取會填入術式名稱，清空前一術式的本院核定方案，避免誤套。沒有院內核定資料時不自動指定本院類別與數量。

- [Johns Hopkins 成人表，原文更新 2025-04-08](https://anesthesiology.hopkinsmedicine.org/wp-content/uploads/2025/04/Blood-Order-Schedule-Adult-4-10-25.pdf)
- [HTAA 第二版 2025](https://portal.appshtaa.moh.gov.my/images/ProfilJabatan/Transfusi/Penerbitan/MSBOS_HTAA.pdf)

兩者都是機構備血作業參考，不是全球通用指引。GSH 對照血型／抗體篩檢；No Sample 不表示永不需輸血。HTAA pint/pints/units 及 JHU U 皆保留原文，不代表台灣標準袋量；HTAA 頁碼為文件印刷頁碼，非 PDF 閱讀器頁序。

## v2.5.1（2026-11-04）

PT、aPTT 改以秒數與 MNPT、MNAPTT 輸入。依使用者提供文件查證後，加入 Friedman 1976、Kim 2022、Chang 2026（預印本）；文件中查不到原文的數字未採用。

## v2.5 血品與備血引導（2026-11-03）

病例、考題與心智圖依此重新設計：8 例皆可帶入引導分頁，`tests/teach.test.cjs` 以引導引擎核對狀態、劑量與預備血量。

新增「血品引導」分頁（#guide，`src/guide.js`）。依病人狀況、實測值與預計術式，列出 RBC、血小板、FFP、fibrinogen、PCC、鈣的適應症判斷與台灣規格參考劑量，以及術前預備血量。規格與用量依臺北榮總 111-11-24 版；RBC 依體重估算、FFP 每 U 110 mL 為工具假設。缺實測值時顯示缺資料，不當成正常。

## v2.4 教學分頁（2026-11-03）

新增示範病例 8 例、考題 20 題（基礎 10、高階 10，答案 A–D 各 5，作答不儲存）與心智圖（#cases、#quiz、#map），資料在 `src/teach.js`。病例可帶入工具，`tests/teach.test.cjs` 以工具實際輸出核對病例與部分考題；內容僅取自本專案已查核的來源。

## v2.3 比對與建議（2026-11-03）

依使用者要求，比對 77 項成人術式於 8 份公開表（Johns Hopkins 2025、UPMC、Toledo、North Bristol、Worcestershire、HTAA 2025、ISBT 收錄範例、UKMMC 2019），資料在 `src/schedule.js`。查無國際權威機構的通用術式備血量。

建議值為工具綜整：取中位數（T&S、不備血算 0，範圍取中點），少於 3 份來源不給值，進位成整袋後以海外 U × 2 換算台灣 U。這個換算是工具假設，只用於比對表；須經輸血委員會核定，不是開單量。

同版修正：編輯時殘留他列檢驗值、TEG/ROTEM 警示只看最後一列、時效或提醒量輸入錯誤時停止更新、窄範圍趨勢圖被壓平、HTAA 連結 404。規則調整：TBI／自發性腦出血 PLT 參考 100 不限創傷情境、產科情境停止數值模擬、TI／TP 分母改為配血人次。v2.3.1 核對 NBA MAGICapp v2.0 全文：GPS2 閾值相符；新增選填 BE、乳酸；GPS2 未列血小板閾值，NBA 情境的 PLT 50 改標引用 Anaesthetists 2025，MHP 範本尚未核對。

## v2.2 台灣血品計量（2026-11-03）

- RBC：台灣 U（非袋數）及實際已輸注 mL 分開，不再預設 280 mL/U。
- FFP：模型使用實際 mL，不設定一袋等於 1 U 或固定250 mL。
- PH：分離術血小板以袋數及實際 mL；PC 另以台灣 U，不能將1 U PC當1袋PH。傳統PC含量未核對時停止數值模型。
- CRYO：台灣U、實際mL及血庫核對 fibrinogen g 分開。不能把最低規格當成實際每U含量；缺必要資料停止相關外推。
- 「血品評估」提供台灣產品參考規格與依袋標計算的 U/mL 核對工具；不同規格分批算。
- MSBOS 主欄改為台灣備血狀態；海外數量只列來源對照。本院量仍須核定，不能把海外 U/pint 直接轉成台灣開單量。
- 產品體積資料僅為國內院所範例，實際以血袋標示及本院血庫優先，非全國固定袋量。

規格來源：臺北榮總111-11-24核定《血液成分使用準則》（2023公開PDF，頁1–2）及嘉義基督教醫院血庫資料，查核2026-11-03。
https://wd.vghtpe.gov.tw/manage/upload/cabfile/f_20230104093058480.pdf
https://www.cych.org.tw/lab/14_%E8%A1%80%E5%BA%AB%E4%BD%9C%E6%A5%AD/bloodbank_FAQ.htm

適應症仍依網站列出的國際指引評估，不將舊產品說明當作最新適應症。
