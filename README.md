# 輸血與術前備血決策輔助 v2.1

繁體中文、無外部依賴、可離線單頁成人教育／研究工具。**臨床決策輔助，不能取代醫師判斷；未經臨床驗證，不得當作醫療器材或自動醫囑。**

## 網站

https://yht5582-source.github.io/Transfusion-MSBOS-/

儲存庫名稱最後有 `-`。2026-11-03 查核原對話無可取回之 HTML 附件；儲存庫起始只有 README/LICENSE，因此本版是重建，不宣稱已保留前版完整 HTML 或 60 餘術式表。

## 使用

開啟 `index.html`，或使用 HTTPS 網址。在手機請以正式瀏覽器開啟；某些附件預覽不執行互動程式。

1. 選成人重大出血、創傷、一般術中或產科情境；標示出血／休克及複雜病因。
2. 新增各時間點，以起始後分鐘輸入**累積已完成** RBC、FFP、PLT 成人量、輸液、失血及 fibrinogen 實際克數。不要將累積量誤填增量。
3. 只輸入該採樣時間實測的項目，未測留白。PT/aPTT 倍數需同次院內參考值（NBA 以 ULN；創傷以正常對照值）。TEG/ROTEM 使用完整儀器、試劑、原值、單位與人工判讀。
4. 觀察逐項最後實測採樣時間及警訊；未来欄位是**額外增量**。血小板與 fibrinogen 只提供機制敏感度範圍；其他項目不作數值外推。
5. 高風險或重大出血由臨床團隊評估 MTP、立即止血、重複檢驗與目標導向血品補充，不等待模型。清空／重整即刪除記憶體內資料。

## 模型與安全邊界

詳細公式、血容量／液體留存／回收率／消耗假設與停止外推條件均見網站「指引與模型」及 `docs/design.md`。32 組參數角點產生的包絡不是信賴區間或經驗證之個人預測；真值可能完全超出範圍。模型未描述完整凝血生理、同區間補充先後順序或輸血反應。

- 每個檢驗各自追蹤時間與錨點，缺失不補成正常、零或本次實測。
- 每項採樣後 4 U RBC 提醒重測；30 分鐘時效是可調工具假設。
- 不自動推薦血品比例、袋數或生成處方；冷沉澱需由血庫換算 g。
- 原術式表無法取回；v2.1 重建 68 項官方來源參考記錄（JHU 36、HTAA 32），支援搜尋／科別篩選／選取，與人工核定本院方案分開。來源原規格不換算台灣 RBC U。
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

## v2.1 術式表修正（2026-11-03）

前版未載入術式資料，只提供自由填寫欄位。現新增 `src/msbos.js` 資料及純搜尋邏輯，顯示 68 項具來源之參考記錄。每項標示來源版本及段落／原文印刷頁碼；選取會填入術式名稱，清空前一術式的本院核定方案，避免誤套。沒有院內核定資料時不自動指定本院類別與數量。

- [Johns Hopkins 成人表，原文更新 2025-04-08](https://anesthesiology.hopkinsmedicine.org/wp-content/uploads/2025/04/Blood-Order-Schedule-Adult-4-10-25.pdf)
- [HTAA 第二版 2025](https://portal.appshtaa.moh.gov.my/images/ProfilJabatan/Transfusi/MSBOS_HTAA.pdf)

兩者都是機構備血作業參考，不是全球通用指引。GSH 對照血型／抗體篩檢；No Sample 不表示永不需輸血。HTAA pint/pints/units 及 JHU U 皆保留原文，不代表台灣標準袋量；HTAA 頁碼為文件印刷頁碼，非 PDF 閱讀器頁序。
