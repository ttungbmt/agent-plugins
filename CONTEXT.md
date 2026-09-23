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

**Khai báo rút gọn**:
Khai báo marketplace viết bằng một chuỗi nguồn (GitHub `owner/repo`, git URL, URL tới `marketplace.json`, hoặc đường dẫn cục bộ), chưa biết tên cho tới khi `claude` đọc `marketplace.json`.
_Avoid_: shorthand, source string

**Known marketplace entry**:
Một mục trong `extraKnownMarketplaces` của settings Claude Code — trạng thái thực tế.

## Plugin

**Khai báo plugin**:
Một khoá `name@marketplace` trong `spec.plugins` của Config hoặc Preset, kèm giá trị bật/tắt — trạng thái mong muốn. Hậu tố `@marketplace` là tên một Marketplace được khai báo; với Khai báo rút gọn, tên chỉ biết sau lần `add` đầu tiên.

**Plugin entry**:
Một khoá trong `enabledPlugins` của settings Claude Code — trạng thái thực tế của việc bật/tắt ở một Scope.
_Avoid_: enabled plugin (khi nói về khoá có giá trị `false`)

**Bản cài plugin**:
Bản plugin đã tải về máy, ghi theo từng Scope nhưng dùng chung thư mục cache trên cả máy. Plugin entry `true` mà thiếu Bản cài plugin ở Scope đó là chưa khớp.
_Avoid_: install (khi nói về khoá trong settings)

## Skill

**Skill**:
Một thư mục `<name>/SKILL.md` đứng riêng, được Claude Code nạp từ thư mục skills của một Scope; không đi qua Marketplace hay Plugin. Skill đóng gói bên trong plugin không gọi là Skill.
_Avoid_: agent skill (khi nói về skill trong plugin)

**Nguồn skill**:
Nơi chứa một hoặc nhiều Skill (vd. repo GitHub `owner/repo`).

**Khai báo skill**:
Một mục trong `spec.skills` của Config hoặc Preset — trạng thái mong muốn. Dạng chuỗi là một Nguồn skill, cài mọi Skill trong đó; dạng map hoặc kèm danh sách Skill được chọn, hoặc kèm danh sách Skill bị loại trừ (cài mọi Skill còn lại). Định danh của Skill là tên của nó; trùng tên khác nguồn theo luật trùng khai báo như Marketplace.

**Danh mục nguồn**:
Tên mọi Skill có trong một Nguồn skill (hoặc mọi Agent trong một Nguồn agent, mọi Rule trong một Nguồn rule) ở commit đã ghim, kể cả thứ không được cài. Nguồn skill, Nguồn agent và Nguồn rule ghim riêng, kể cả khi cùng một repo. Commit không đổi nên danh mục không đổi; nhờ đó biết "tất cả" gồm những Skill hoặc Agent nào mà không cần tải lại nguồn.

**Bản cài skill**:
Thư mục Skill có mặt trong thư mục skills của một Scope — trạng thái thực tế. Chỉ có ở scope `project` và `user`.

## Agent

**Agent**:
Một file `<name>.md` đứng riêng (subagent), được Claude Code nạp từ thư mục agents của một Scope; không đi qua Marketplace hay Plugin. Agent đóng gói bên trong plugin không gọi là Agent — nó được bật cùng plugin qua Khai báo plugin.
_Avoid_: subagent (khi nói về khai báo), agent trong plugin

**Nguồn agent**:
Nơi chứa một hoặc nhiều Agent (vd. repo GitHub `owner/repo`).

**Khai báo agent**:
Một mục trong `spec.agents` của Config hoặc Preset — trạng thái mong muốn. Cùng dạng và luật gộp với Khai báo skill: chuỗi là một Nguồn agent (cài mọi Agent), map chọn hoặc loại trừ Agent. Định danh của Agent là tên trong frontmatter của nó.

**Bản cài agent**:
File Agent có mặt trong thư mục agents của một Scope — trạng thái thực tế. Chỉ gồm đúng một file `.md`; chỉ có ở scope `project` và `user`.

## Rule

**Rule**:
Một file `.md` đứng riêng, được Claude Code nạp từ thư mục rules của một Scope; định danh bằng đường dẫn tương đối trong Nguồn rule, bỏ đuôi `.md` (vd. `web/coding-style`, `security`). Không có tên trong frontmatter. `README.md` không phải Rule.
_Avoid_: instruction, rule group (khi nói về một file)

**Nguồn rule**:
Nơi chứa một hoặc nhiều Rule (vd. repo GitHub `owner/repo`), với gốc rules là `path` được khai báo hoặc thư mục `rules/`. Chỉ nhận Rule theo định dạng của Claude Code.

**Khai báo rule**:
Một mục trong `spec.rules` của Config hoặc Preset — trạng thái mong muốn. Cùng dạng với Khai báo skill (chuỗi, chọn, loại trừ), nhưng mỗi mục chọn hoặc loại trừ là một đường dẫn: trỏ tới file là một Rule, trỏ tới thư mục là mọi Rule nằm dưới nó.

**Namespace**:
Thư mục con trong thư mục rules của Scope mà mọi Rule của một Nguồn rule được cài vào, giữ nguyên cấu trúc thư mục của nguồn. Mặc định là tên repo viết thường, đổi được bằng `as`. Hai nguồn khác nhau không được dùng chung một Namespace.
_Avoid_: prefix, rule group

**Bản cài rule**:
File Rule có mặt trong một Namespace của thư mục rules của một Scope — trạng thái thực tế. Chỉ có ở scope `project` và `user`.

## MCP server

**MCP server**:
Một server MCP đứng riêng mà Claude Code nạp từ cấu hình MCP của một Scope (`.mcp.json` với `project`, `~/.claude.json` với `local`/`user`); không đi qua Marketplace hay Plugin. MCP server đóng gói bên trong plugin (hiện dưới tên `plugin:<plugin>:<server>`) không gọi là MCP server — nó được bật cùng plugin qua Khai báo plugin.
_Avoid_: MCP (khi nói về server trong plugin)

**Khai báo MCP server**:
Một khoá tên trong `spec.mcpServers` của Config hoặc Preset — trạng thái mong muốn. Giá trị `true` lấy nguyên cấu hình từ Danh mục MCP; map là cấu hình inline đúng định dạng của Claude Code; `false` bỏ MCP server đã kế thừa. Định danh là tên. Secret chỉ được viết dạng placeholder `${VAR}`.

**Danh mục MCP**:
Tập cấu hình MCP server đi kèm `ap`, tra bằng tên qua giá trị `true`. Người dùng không khai báo danh mục riêng; muốn dùng lại thì viết một Preset chỉ chứa `mcpServers`.
_Avoid_: registry, catalog (khi nói về MCP Registry)

**Bản cài MCP server**:
Cấu hình MCP server có mặt trong cấu hình MCP của một Scope — trạng thái thực tế. Bản cài ở `.mcp.json` chỉ chạy sau khi người dùng duyệt; `ap` không duyệt thay.

## Sở hữu

**Managed entry**:
Known marketplace entry, Plugin entry, Bản cài skill, Bản cài agent hoặc Bản cài rule do `ap` tạo và được ghi nhận trong Lock/State; `ap` được phép sửa hoặc gỡ nó.

**Manual entry**:
Known marketplace entry, Plugin entry, Bản cài skill, Bản cài agent hoặc Bản cài rule người dùng tự thêm; `ap` không bao giờ sửa hay gỡ nó. Khi nó khớp đúng một khai báo, `ap` nhận quản lý và nó thành Managed entry.

## Đồng bộ

**Sync**:
Đưa Known marketplace entry, Plugin entry, Bản cài plugin, Bản cài skill, Bản cài agent và Bản cài rule của một Scope về khớp với các khai báo đã phân giải.

**Scope**:
Tầng settings của Claude Code mà Sync nhắm tới: `project`, `local` hoặc `user`.

**Lock**:
File `agent-plugins.lock` được commit, ghi các Managed entry ở scope `project`, Danh mục nguồn của các Nguồn skill, Nguồn agent và Nguồn rule đã ghim và mã băm của Preset từ xa.

**State**:
Bản ghi Managed entry và Danh mục nguồn của scope `local` hoặc `user`, không được commit.
_Avoid_: lock (cho scope cá nhân)
