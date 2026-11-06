# AVIES Student Android — bản thử APK local

React Native + Expo Router, project độc lập trong repo FE. Không dùng WebView/Capacitor. Phạm vi: đăng nhập Student, lịch thi phân trang, mở/nhận lại quyền lượt thi, nghe câu hỏi streaming, trả lời streaming, follow-up, text câu hiện tại theo yêu cầu, bỏ qua/quay lại, tạm dừng, kết thúc và xem transcript đã lưu.

## Cài và test trên điện thoại

1. Chạy Backend như hiện tại. Giữ Supabase, Azure Speech **F0**, Gemini Free và các cấu hình streaming đã có. Không cần migration, deploy web, mua hosting, Expo hay Google Play.
2. Laptop và điện thoại cùng Wi-Fi. Trên laptop chạy `ipconfig`, lấy IPv4 của card Wi-Fi, ví dụ `192.168.1.10`.
3. Chuyển `artifacts/avies-student-demo-arm64.apk` sang điện thoại và mở để cài. Cho phép ứng dụng quản lý file/trình duyệt cài APK nếu Android hỏi. Bản này dành cho **Android ARM64**, không phải AAB gửi lên CH Play.
4. Trong màn đăng nhập, nhập địa chỉ Backend, ví dụ `http://192.168.1.10:8080`. Dùng tài khoản **Student thật đã được Lecturer phân công**. Không nhập `localhost` của laptop trên điện thoại. Máy ảo Android Studio có thể dùng `http://10.0.2.2:8080`.
5. Mở lịch → Chuẩn bị thi → Bắt đầu lượt thi đúng lịch. Không mở cùng lượt trên web; demo một Student nhận dạng đồng thời theo giới hạn BE hiện tại.
6. Cho phép microphone khi app kiểm tra quyền trước lúc mở lượt thi. Sau khi nghe AI, bấm **Bật microphone và trả lời**, nói, rồi **Trả lời xong**. Kiểm tra transcript đã lưu, câu kế tiếp/follow-up và cuối cùng trạng thái hoàn thành từ Backend.

APK này có sẵn bundle JavaScript: không cần mở Vite/Metro/Expo Go để dùng. Laptop vẫn phải bật BE và có Internet để BE gọi Supabase/AI. Khi hết quota miễn phí, dịch vụ có thể dừng; app không mua quota hay tự đổi F0 sang S0.

Nếu không kết nối được: kiểm tra IP LAN, cổng BE, cùng Wi-Fi, mạng không chặn các thiết bị với nhau và Windows Firewall. Có thể cần cho Java/port 8080 truy cập **Private network**. Không tắt toàn bộ Firewall. Không có thay đổi Firewall tự động trong source này.

## Build miễn phí trên Windows

Cần Node tương thích Expo SDK đã khóa trong `package-lock.json`, JDK 21, Android SDK/NDK. Máy đã có Android Studio có thể dùng SDK của nó. Lần đầu phải tải dependency; không dùng Expo cloud build.

```powershell
cd D:\SEM7\SWD392\Project-Assignment\src\aives-frontend\mobile
npm.cmd ci
npm.cmd run check
npm.cmd test

# Nếu SDK/JDK chưa có biến môi trường, truyền đường dẫn thật:
.\scripts\build-apk.ps1 -SdkPath "$env:LOCALAPPDATA\Android\Sdk" -JdkPath 'C:\Program Files\Java\jdk-21.0.10'
```

Script tự prebuild Android và chạy `assembleRelease` với `arm64-v8a`, đồng thời chạy native unit tests. APK được copy vào `artifacts/`. `android/`, SDK local, Gradle cache, APK, keystore và `.env` không commit. Gradle giữ signing demo do Expo template tạo; đây **không phải khóa phát hành production/CH Play**.

Trên Windows, script mặc định giữ Gradle cache trong `.gradle-local` trên cùng ổ với project, dùng một drive alias tạm để tránh giới hạn đường dẫn CMake/Ninja. Alias và biến môi trường được khôi phục khi script kết thúc. Config plugin đặt native staging tại `../../.avies-cxx` tính từ thư mục `mobile`; thư mục này chỉ chứa output build, không phải source. Nếu đã đặt `GRADLE_USER_HOME`, script dùng cache đó.

Để sửa app và hot reload bằng development build:

```powershell
npm.cmd run android
npm.cmd start
```

Development build cần Metro khi phát triển. APK standalone từ script build ở trên không cần Metro. Expo Go không có module PCM native của project này.

## Kiến trúc và các giới hạn giữ nguyên

- `src/api.ts`: đăng nhập và REST Student hiện có; JWT ở Expo SecureStore, không lưu password, không có provider key trong APK. URL Backend do người test nhập; HTTP chỉ chấp nhận private IPv4/loopback cho demo LAN, public host phải HTTPS.
- `src/contracts.ts`: kiểm tra/phép chiếu whitelist response, scope exam/turn/revision, đếm giờ từ mốc server; không giữ dữ liệu chấm nội bộ ngoài hợp đồng.
- `src/session.ts`: một thao tác ghi tại một thời điểm, client UUID ổn định theo Backend/user/exam, heartbeat riêng 10s, REST đối soát 2s và WS state push. Không POST Start khi chỉ mở màn hình. Không tự quyết định chọn câu, follow-up, thêm giờ hoặc kết quả.
- `modules/oral-audio`: Kotlin Expo local module. `AudioRecord` PCM16 mono 16kHz, frame khoảng 100ms → WS `AUTH`/`START` → binary PCM. Token không nằm trong URL. `FINISH` giữ đúng command/requestId; chỉ final transcript do BE/Azure xác nhận mới thành câu trả lời.
- TTS qua cùng endpoint NDJSON streaming hiện có, PCM16 mono 24kHz → `AudioTrack`. Chỉ gửi `PROMPT_FINISHED` sau `end` hợp lệ **và** playback đã drain. Lỗi mạng/audio, thiếu `end`, cuộc gọi làm mất audio focus hoặc app ra nền không được coi là đã nghe xong.
- WAV/receipt chưa xác nhận nằm trong `filesDir` riêng, không public storage, không Android backup; không kèm key/JWT. Giữ cả khi mất kết nối hoặc process bị đóng. Bản ghi chỉ được gửi lại đúng turn; đối soát/xóa sau khi BE xác nhận đã nhận hoặc turn đã khép. Không tự tạo transcript rỗng/giả hoặc tự chấm 0 do lỗi kỹ thuật.
- Ra nền/tắt màn hình/rời phòng dừng audio và microphone. Thời hạn BE vẫn chạy; quay lại phải nhận lại quyền. Không có background recording/service. Dùng tai nghe và giữ màn hình app mở khi thi.
- Phòng thi giữ màn hình sáng trong lúc đang mở; không cần Student tự chạm màn hình để tránh sleep. Chuyển sang app khác vẫn dừng audio như trên.
- Streaming và Android không bảo đảm AI luôn trả lời dưới 5 giây. Thời gian LLM, DB, mạng và quota vẫn là chi phí ngoài app.

## Kiểm thử

Kết quả kiểm tra bản APK 0.1.0: TypeScript và lint pass; **24/24 mobile tests**, **3/3 native JUnit tests** pass. `assembleRelease` thành công; chữ ký APK v2 hợp lệ; gói có `assets/index.android.bundle`, chỉ ABI `arm64-v8a`, minSdk 24 (Android 7.0). Kiểm tra hồi quy web hiện có: **324/324 tests** và build pass. Chưa xác minh trực tiếp microphone/loa hoặc một bài thi thật trên điện thoại vì chưa có thiết bị kết nối; cần thực hiện các bước thử bên dưới sau khi cài.

APK local: `artifacts/avies-student-demo-arm64.apk`, 29.380.459 byte. SHA-256:

```text
AC9C674BE1CF97055EDBDD3640EB5233FCC7EA1F5BC986A2E910FF0BF41B7F90
```

`npm.cmd test`: hợp đồng Student, thời gian, ownership, thứ tự state push/RESULT, partial không thành saved transcript, receipt trước FINISH, xử lý quota TTS, app ra nền và đối soát bản ghi.

Native JUnit chạy cùng script build: WAV 16kHz/mono/PCM16, hạn mức byte và xác minh URL LAN/TLS.

Sau khi cài trên Android thật, cần thử ít nhất: Việt/Anh, nghe lại/text, bỏ qua/quay lại, đủ/không đủ follow-up, hết giờ, từ chối mic, mất Wi-Fi sau SUBMIT, ra nền/quay lại, kill/reopen app và kết thúc câu cuối. Không kết luận nhận dạng/phát âm trên phần cứng thật đã được xác minh chỉ từ unit test/build APK.

Nguồn: [Expo local builds](https://docs.expo.dev/guides/local-app-production/), [APK direct install](https://docs.expo.dev/build-reference/apk/), [Expo local native modules](https://docs.expo.dev/modules/get-started/).
