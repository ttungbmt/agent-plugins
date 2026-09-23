# Preset kế thừa bằng `extends`, Config chọn bằng `presets`

Preset kế thừa Preset khác qua `spec.extends`, còn Config chọn Preset qua `spec.presets`; dùng lẫn là lỗi. Hai từ được giữ riêng có chủ ý vì hai quan hệ có luật khác nhau: Preset con **thắng** mọi Preset trong cây `extends` của nó, còn các Preset được chọn cạnh nhau là **ngang hàng** và khác source thì báo xung đột. Khi ghi đè, Preset con thay **cả entry** (source và field phụ) chứ không gộp field phụ, giống cách Config ghi đè Preset: ai khai báo gần Config nhất thì sở hữu toàn bộ entry.

## Considered Options

- Một từ `presets` cho cả hai — bị loại vì che mất khác biệt ghi đè/ngang hàng.
- Một từ `extends` cho cả hai — bị loại vì Config không "kế thừa" mà chọn tổ hợp Preset.
- Preset con gộp field phụ với Preset cha — bị loại vì không bỏ được field phụ của cha và khó đoán kết quả.

## Consequences

- Thứ tự ưu tiên tính theo đồ thị kế thừa, không theo thứ tự nạp: một Preset dùng chung chỉ nạp một lần nhưng mọi Preset kế thừa nó vẫn ghi đè được nó.
