# Agent Plugins

Công cụ `ap` khai báo tập marketplace/plugin mong muốn cho Claude Code bằng các file YAML, rồi đồng bộ chúng vào settings của Claude Code.

## Khai báo

**Config**:
File `agent-plugins.yaml` (`kind: Config`) — điểm vào duy nhất mà `ap` đọc, chọn các Preset và có thể khai báo thêm marketplace riêng.
_Avoid_: Manifest, Project, profile

**Preset**:
Một khối khai báo tái sử dụng được (`kind: Preset`), có thể kế thừa Preset khác.
_Avoid_: template, bundle

**Kế thừa**:
Quan hệ một Preset khai báo qua `spec.extends`: Preset con nhận khai báo của Preset cha và được ghi đè chúng.
_Avoid_: include, import, chọn (dùng cho Config)

**Chọn Preset**:
Việc Config liệt kê Preset qua `spec.presets`; các Preset được chọn là ngang hàng với nhau.
_Avoid_: extends, kế thừa (dùng cho Preset)

**Preset mặc định**:
Preset đi kèm `ap`, được tham chiếu bằng tên trần.
_Avoid_: built-in preset, default config

**Preset cục bộ**:
Preset là file trong repo người dùng, tham chiếu bằng đường dẫn tương đối.

**Preset từ xa**:
Preset tải qua `https://`, được ghim theo nội dung.

## Marketplace

**Marketplace**:
Nguồn plugin của Claude Code, định danh bằng tên khai báo trong `marketplace.json` của nó.

**Khai báo marketplace**:
Một mục trong `spec.marketplaces` của Config hoặc Preset — trạng thái mong muốn.
_Avoid_: marketplace entry (dùng cho settings)

**Known marketplace entry**:
Một mục trong `extraKnownMarketplaces` của settings Claude Code — trạng thái thực tế.

**Managed entry**:
Known marketplace entry do `ap` tạo và được ghi nhận trong Lock/State; `ap` được phép sửa hoặc gỡ nó.

**Manual entry**:
Known marketplace entry người dùng tự thêm; `ap` không bao giờ sửa hay gỡ nó.

## Đồng bộ

**Sync**:
Đưa Known marketplace entry của một Scope về khớp với tập Khai báo marketplace đã phân giải.

**Scope**:
Tầng settings của Claude Code mà Sync nhắm tới: `project`, `local` hoặc `user`.

**Lock**:
File `agent-plugins.lock` được commit, ghi các Managed entry ở scope `project` và mã băm của Preset từ xa.

**State**:
Bản ghi Managed entry của scope `local` hoặc `user`, không được commit.
_Avoid_: lock (cho scope cá nhân)
