# Research: README cho một CLI — giúp người dùng cài và dùng `ap` nhanh nhất

Câu hỏi: README của `ap` nên có những phần gì, theo thứ tự nào, dài bao nhiêu, để người dùng cài và chạy được lệnh đầu
tiên nhanh nhất; phần nào nên tách sang `CONTRIBUTING.md` hoặc `docs/`?
Nguồn kiểm tra ngày 2026-09-25. Chỉ dùng nguồn sơ cấp: hướng dẫn gốc ([clig.dev](https://clig.dev/),
[GitHub Docs](https://docs.github.com/en/repositories/managing-your-repositorys-settings-and-features/customizing-your-repository/about-readmes),
[standard-readme spec](https://github.com/RichardLitt/standard-readme/blob/main/spec.md),
[makeareadme.com](https://www.makeareadme.com/)) và README thật của các CLI, tải trực tiếp từ nhánh mặc định của từng repo.
Số dòng/vị trí code block là số đo trên file raw tải về ngày kiểm tra.

## Tóm tắt

- **README là trang đích cho người _dùng_, không phải sổ tay.** GitHub: README "should only contain information necessary
  for developers to get started using and contributing"; tài liệu dài hơn thuộc về chỗ khác
  ([GitHub Docs](https://docs.github.com/en/repositories/managing-your-repositorys-settings-and-features/customizing-your-repository/about-readmes)).
  clig.dev tách rõ help text (ngắn, ngay lập tức) với documentation (đầy đủ, trên web)
  ([clig.dev#documentation](https://clig.dev/#documentation)).
- **Thứ tự gần như thống nhất:** tên → một câu mô tả → (demo) → Install → Quickstart/Usage → nơi đọc tiếp → hỗ trợ →
  Contributing (link) → License. Đây là thứ tự của standard-readme (bắt buộc theo thứ tự) và makeareadme (gợi ý).
- **Các CLI tốt đưa người đọc tới lệnh đầu tiên trong vòng một màn hình**, và dạy bằng ví dụ có output (uv, mise,
  devbox). Tool có site docs riêng thì README chỉ còn là "biển chỉ đường" (chezmoi 17 dòng, Terraform 48 dòng, pnpm không
  có code block nào).
- **Tool khai báo (declarative) luôn cho xem file cấu hình tối thiểu** ngay trong quickstart: mise in `mise.toml` đầy
  đủ, devbox in `devbox.json` sau khi `devbox add`. Với `ap` đó là một `agent-plugins.yaml` nhỏ nhất có tác dụng.
- **Hướng dẫn phát triển và release đi ra `CONTRIBUTING.md`.** gh, uv, mise, devbox, Terraform, chezmoi đều chỉ để một
  dòng link sang contributing guide.

---

## 1. Hướng dẫn gốc

### 1.1 GitHub Docs — "About the repository README file"

([nguồn](https://docs.github.com/en/repositories/managing-your-repositorys-settings-and-features/customizing-your-repository/about-readmes))

- README "is often the first item a visitor will see" và thường trả lời 5 câu: dự án làm gì, vì sao hữu ích, bắt đầu thế
  nào, tìm trợ giúp ở đâu, ai duy trì/đóng góp.
- GitHub tự sinh mục lục ("Outline") từ heading của mọi file Markdown → không cần tự viết TOC cho README ngắn.
- Nội dung vượt 500 KiB bị cắt khi hiển thị.
- Nên dùng **link tương đối** tới file khác trong repo (ví dụ `docs/CONTRIBUTING.md`); GitHub tự đổi theo nhánh đang xem,
  và link tuyệt đối "may not work in clones". Link text phải nằm trên một dòng.
- "A README should only contain information necessary for developers to get started using and contributing to your
  project. Longer documentation is best suited for wikis."
- README, license, contribution guidelines và code of conduct cùng nhau "communicates expectations for your project".

### 1.2 standard-readme spec

([nguồn](https://github.com/RichardLitt/standard-readme/blob/main/spec.md)) — viết cho thư viện open source, nhưng phần
CLI áp dụng được.

- Thứ tự bắt buộc: Title → Banner → Badges → Short Description → Long Description → Table of Contents → Security →
  Background → **Install** → **Usage** → Extra Sections → API → Maintainers → Thanks → **Contributing** → **License**
  (License "Must be last section").
- Short Description: dưới 120 ký tự, trên một dòng riêng, không có heading, **khớp với `description` của package manager
  và mô tả repo trên GitHub**.
- Table of Contents: bắt buộc, trừ README dưới 100 dòng.
- Install: phải có code block; subsection `Dependencies` bắt buộc khi có dependency phải cài tay; gợi ý thêm phần
  `Updating`.
- Usage: phải có code block; "If CLI compatible, code block indicating common usage"; subsection `CLI` bắt buộc nếu có
  CLI.
- Contributing: nêu chỗ đặt câu hỏi, có nhận PR không, link tới `CONTRIBUTING` và issues.
- "Must not contain broken links"; code ví dụ nên được lint như code còn lại.

### 1.3 makeareadme.com

([nguồn](https://www.makeareadme.com/))

- Template tối giản: Tên → mô tả một câu → Installation → Usage → Contributing → License.
- Installation: người đọc có thể là novice, "Listing specific steps helps remove ambiguity and gets people to using your
  project as quickly as possible"; chỉ chạy trên phiên bản ngôn ngữ/OS nhất định hoặc cần cài tay dependency → thêm
  subsection **Requirements**.
- Usage: "Use examples liberally, and show the expected output if you can"; đưa ví dụ nhỏ nhất inline, ví dụ phức tạp
  thì link ra ngoài.
- Visuals: screenshot hoặc GIF (gợi ý asciinema).
- Support: nói rõ đi đâu để được giúp (issue tracker, chat…). Project status: nếu dự án chậm lại thì ghi ở đầu README.
- README quá dài → dùng "another form of documentation" thay vì cắt thông tin. Contributing có thể tách thành
  `CONTRIBUTING.md`; GitHub sẽ tự đưa link tới nó khi người khác mở issue/PR.

### 1.4 Command Line Interface Guidelines (clig.dev)

clig.dev nói về help text và docs của chính CLI, nhưng các nguyên tắc chuyển thẳng sang README:

- **Lead with examples**: "Users tend to use examples over other forms of documentation, so show them first… If it helps
  explain what it's doing and it isn't too long, show the actual output too." Có thể "tell a story with a series of
  examples, building your way toward complex uses". Quá nhiều ví dụ → "put them somewhere else"
  ([clig.dev#help](https://clig.dev/#help)).
- **Display the most common flags and commands at the start** ([clig.dev#help](https://clig.dev/#help)).
- **Provide a support path for feedback and issues** và **link to the web version of the documentation**
  ([clig.dev#help](https://clig.dev/#help)).
- **Provide web-based documentation** — người dùng cần tìm kiếm được và link được tới từng phần; **provide terminal-based
  documentation** vì nó "stays in sync with the specific installed version"
  ([clig.dev#documentation](https://clig.dev/#documentation)). → README nên nhắc `ap --help` / `ap sync --help` là nguồn
  chính xác theo phiên bản đã cài.
- **Dry run trước thao tác lớn** là một phần của "conversation" với người dùng
  ([clig.dev#conversation-as-the-norm](https://clig.dev/#conversation-as-the-norm)); với thay đổi "moderate" nên "giving
  the user a way to 'dry run' the operation" ([clig.dev#arguments-and-flags](https://clig.dev/#arguments-and-flags)). →
  quickstart của `ap` nên dạy `--dry-run` trước `ap sync`.
- **Errors**: "One of the most common reasons to consult documentation is to fix errors"
  ([clig.dev#errors](https://clig.dev/#errors)) → đáng có mục Troubleshooting ngắn cho các lỗi hay gặp.
- **Make it easy to uninstall. If it needs instructions, put them at the bottom of the install instructions—one of the
  most common times people want to uninstall software is right after installing it**
  ([clig.dev#distribution](https://clig.dev/#distribution)).

## 2. README thật của các CLI

| Tool | Dòng | Code block đầu tiên ở dòng | Cấu trúc (theo heading) | Docs sâu ở đâu |
|---|---|---|---|---|
| [gh](https://github.com/cli/cli/blob/trunk/README.md) | 122 | 20 | mô tả + screenshot → Documentation → Agent skills → Contributing → Installation (theo OS) → Verification → Comparison | manual `cli.github.com`, `docs/install_*.md` |
| [uv](https://github.com/astral-sh/uv/blob/main/README.md) | 326 | 48 | badges → mô tả → chart → Highlights → Installation → Documentation → Features (ví dụ + output) → Contributing → FAQ → Acknowledgements → License | `docs.astral.sh/uv`, `uv help` |
| [mise](https://github.com/jdx/mise/blob/main/README.md) | 206 | 73 (sau khối logo/sponsor HTML) | What is mise? → Quickstart 1–4 → Check your project setup → Where to go next (bảng) → Demo → Issues & Discussions → Contributors | `mise.jdx.dev`, bảng "I want to… / Read" |
| [pnpm](https://github.com/pnpm/pnpm/blob/main/README.md) | 270 | không có | logo → feature bullets → badges → sponsors (~190 dòng) → Background → Getting Started (6 link) → Benchmark → License | `pnpm.io` |
| [chezmoi](https://github.com/twpayne/chezmoi/blob/master/README.md) | 17 | không có | logo + badge → một câu mô tả → link docs → link developer guide → Contributors → License | `chezmoi.io` |
| [Terraform](https://github.com/hashicorp/terraform/blob/main/README.md) | 48 | không có | link list → mô tả + key features → Getting Started & Documentation → Developing Terraform → License | `developer.hashicorp.com` |
| [Devbox](https://github.com/jetify-com/devbox/blob/main/README.md) | 195 | 46 | logo + badges → What is it? → Demo (SVG) → Installing → Benefits → Quickstart 8 bước → Additional commands → Community → Contributing → License | `jetify.com/docs/devbox` |
| [Renovate](https://github.com/renovatebot/renovate/blob/main/readme.md) | 143 | không có | banner + 6 badges → What is…? → Features → Ways to run → Docs → Get involved → Security | `docs.renovatebot.com` |

([Homebrew Bundle](https://github.com/Homebrew/homebrew-bundle/blob/master/README.md) đã gộp vào Homebrew/brew; README
còn 3 dòng, nên không dùng làm mẫu.)

Nhận xét cụ thể:

- **Một câu mô tả ngay dưới tên.** gh: "`gh` is GitHub on the command line."; uv: "An extremely fast Python package and
  project manager, written in Rust."; chezmoi: "Manage your dotfiles across multiple diverse machines, securely."
- **Tốc độ tới lệnh đầu tiên.** gh đặt link "installation options see below" ngay ở dòng 14 rồi mới tới cài theo OS.
  mise và devbox có Quickstart **đánh số**: cài → thử một lệnh → tạo file cấu hình → chạy. mise còn ghi kết quả mong
  đợi ("The output includes the Node.js version and `development`").
- **Ví dụ kèm output.** uv dùng block `console` với `$` + output thật cho mọi feature (`uv init`, `uv add`, `uv sync`…).
  devbox in lại nội dung `devbox.json` sau lệnh `devbox add` để người đọc thấy lệnh đã ghi gì vào file.
- **File cấu hình trong README (tool khai báo).** mise: một `mise.toml` 9 dòng gồm đủ 3 khái niệm chính (`[tools]`,
  `[env]`, `[tasks]`), rồi lệnh chạy nó và câu "Commit `mise.toml` so teammates and CI can run the same command". devbox:
  "This creates a `devbox.json` file… You should commit it to source control." Terraform thì không có ví dụ HCL nào — đẩy
  hết sang tutorial.
- **Cài đặt.** uv cho cả standalone installer lẫn `pip`/`pipx`, rồi `uv self update`, rồi link "installation
  documentation". gh dùng ma trận theo OS nhưng mỗi mục chỉ là link sang `docs/install_*.md`. mise: một lệnh cho
  macOS/Linux, một cho Windows, còn lại link. gh có mục "Verification of binaries" với `gh at verify` (build provenance).
- **Kiểm tra sau cài / troubleshooting.** mise có mục "Check your project setup" (`mise config ls`, `mise ls --current`,
  `mise doctor`) và link Troubleshooting trong bảng "Where to go next". Các README còn lại để troubleshooting trên site.
- **Nơi đọc tiếp.** mise dùng bảng theo ý định người đọc ("I want to… | Read"), gồm cả dòng "Contribute to mise" →
  `CONTRIBUTING.md`. devbox kết mỗi phần bằng "Read more on the Devbox docs"; `devbox help` cho danh sách lệnh.
- **Badges.** Từ 0 (gh) tới 6 (pnpm, Renovate). Loại hay gặp: version/release, license, CI status, Discord.
  standard-readme yêu cầu badge không có heading riêng và gợi ý host local cho badge tĩnh để tránh tracking.
- **Contributing.** Tất cả chỉ để 1–3 dòng + link (`CONTRIBUTING.md`, developer guide). Terraform để mục "Developing
  Terraform" chỉ gồm link. Không README nào trong nhóm đặt lệnh build/test/release trong README.
- **Phần gây nhiễu.** pnpm có ~190 dòng sponsor trước "Getting Started"; mise đặt khối sponsor HTML trước "What is
  mise?". Cả hai có site docs riêng nên chấp nhận được; `ap` không có site, nên không nên chèn gì giữa mô tả và Install.

## 3. Áp dụng cho `ap`

Bối cảnh: `ap` chưa có site docs; tài liệu sâu nằm ở `docs/design/`, `docs/adr/`, `docs/faqs.md` (tiếng Việt) và
`schemas/`. Người dùng cần Node ≥ 22, `claude`, `git`; cài bằng Release tarball (`npm i -g <url>`). Khái niệm người
dùng phải nắm: Config, Preset (Bundled/Local/Remote preset), Scope (`project`/`local`/`user`), Lock/State, Managed entry
và Manual entry. README hiện tại (99 dòng) trộn Install/Usage với Development/Releasing và một bảng Prior Art dài.

Hệ quả:

- **README chính là docs web của `ap`** (clig.dev "Provide web-based documentation"), nên cần đủ hơn chezmoi/Terraform:
  nó phải tự chứa Quickstart và một Config mẫu, theo kiểu mise/devbox, không chỉ là trang link.
- **Config mẫu tối thiểu nhưng có tác dụng thật**: chọn một Bundled preset và khai báo thêm một thứ (ví dụ một MCP server
  hoặc plugin), kèm modeline `yaml-language-server` trỏ tới `config.schema.json` để editor gợi ý. Tên key dùng đúng
  schema (`kind: Config`, `metadata.name`, `spec.presets`…).
- **Dạy `ap sync --dry-run` trước `ap sync`** và cho xem một đoạn output thật của dry-run (uv/makeareadme: show expected
  output; clig.dev: dry run cho thay đổi lớn). Đây cũng là câu trả lời cho nỗi lo "nó sẽ ghi gì vào `~/.claude`".
- **Giải thích Scope bằng bảng ngắn**: Scope → ghi vào đâu → có commit không (Lock `agent-plugins.lock` với `project`,
  State với `local`/`user`). Nói rõ `ap` chỉ đụng Managed entry, không đụng Manual entry — điều người dùng cần biết trước
  khi chạy lên cấu hình Claude Code đang dùng.
- **Flags phổ biến ở đầu**: `--scope`, `--dry-run`, `--check` (CI), `--update`, `--force`, `--verbose` trong một bảng,
  rồi "`ap sync --help` là nguồn chính xác theo phiên bản đã cài".
- **Install gọn**: Requirements → một lệnh → `ap --version` → Update / Pin version / Uninstall ngay bên dưới (clig.dev:
  uninstall ở cuối phần install). Verify attestation và `npx` là tuỳ chọn, để trong `<details>` hoặc ở docs.
- **Troubleshooting ngắn** cho lỗi đã biết: `claude`/`git` không có trên `PATH`; bản cài cũ tên `agent-plugins` chặn bin
  `ap` (`npm uninstall -g agent-plugins`); `npx` với URL `latest` bị cache. Mỗi mục: triệu chứng → lệnh sửa.
- **Tách ra `CONTRIBUTING.md`**: Development (`mise install`, `pnpm install`, `pnpm ap …`, test/typecheck), smoke-test
  release, Releasing và link `docs/releasing.md`. README chỉ giữ 1–2 dòng link (mọi README đã khảo sát đều vậy).
- **Prior Art**: rút thành mục "Acknowledgements" ngắn ở gần cuối (uv có "Acknowledgements" trước License), hoặc chuyển
  bảng sang docs; không để bảng 6 hàng chiếm nửa README.
- **Short Description khớp nhau** giữa dòng dưới tiêu đề, `description` trong `packages/cli/package.json` và About của
  repo GitHub (standard-readme).
- **License**: repo hiện chưa có file `LICENSE`; standard-readme và makeareadme đều coi License là mục bắt buộc/cuối
  cùng, nên cần quyết định license trước khi viết mục này.
- **Ngôn ngữ**: README viết tiếng Anh (quy ước repo); link sang `docs/` cần ghi chú là tài liệu tiếng Việt.

## 4. Checklist: thứ tự mục cho README của `ap`

1. **Title + one-line description** (< 120 ký tự, khớp `package.json` và About GitHub). Tuỳ chọn 2–3 badge: latest
   release, license (khi đã có), không cần badge CI vì CI chỉ chạy khi release.
2. **Đoạn giới thiệu 2–4 câu**: `ap` đọc `agent-plugins.yaml` (Config), chọn Preset, rồi Sync marketplaces, plugins,
   skills, agents, rules, workflows, MCP servers và hooks vào một Scope của Claude Code. Có thể thêm 3–5 bullet lợi ích
   (khai báo một lần, commit được, dry-run trước khi ghi, không đụng Manual entry).
3. **Tuỳ chọn: demo** — asciinema/GIF hoặc một block `console` của `ap sync --dry-run` (có text transcript như mise).
4. **Install**
   - Requirements: Node ≥ 22, `claude`, `git` trên `PATH`; Linux/macOS/WSL.
   - Một lệnh `npm i -g …/latest/download/ap.tgz`, rồi `ap --version`.
   - Update · Pin a version · Uninstall (ngay dưới lệnh cài).
   - Tuỳ chọn (gập lại): `pnpm add -g`, verify attestation, chạy bằng `npx`.
5. **Quickstart** (đánh số như mise/devbox)
   1. `ap init` — tạo `agent-plugins.yaml`.
   2. Sửa Config: in đầy đủ một file mẫu nhỏ nhất.
   3. `ap sync --dry-run` — kèm output mẫu.
   4. `ap sync` — rồi nói nên commit `agent-plugins.yaml` và `agent-plugins.lock`.
6. **Concepts in 1 minute**: Config vs Preset (Preset selection vs Inheritance), bảng Scope → nơi ghi → Lock/State, Managed
   entry vs Manual entry. Mỗi thuật ngữ link sang `CONTEXT.md`.
7. **Common tasks** (công thức ngắn): dùng chung một setup cho mọi repo (`--scope user`, đoạn hiện có); kiểm tra trong CI
   (`ap sync --check`); cập nhật source đã pin (`--update`); thêm MCP server từ catalog; dùng Local/Remote preset.
8. **Command reference ngắn**: bảng `ap init` / `ap sync` + flags phổ biến; nhắc `ap <cmd> --help`.
9. **Configuration reference**: link `schemas/config.schema.json`, `schemas/preset.schema.json`, danh sách Bundled preset
   và MCP catalog (`packages/cli/presets/`), thư mục `examples/`.
10. **Troubleshooting**: 3–5 lỗi hay gặp, mỗi lỗi triệu chứng → cách sửa; link `docs/faqs.md`.
11. **Where to go next** (bảng "I want to… | Read" như mise): design `docs/design/`, lý do quyết định `docs/adr/`,
    thuật ngữ `CONTEXT.md`, đóng góp `CONTRIBUTING.md`.
12. **Support / Contributing**: issues để báo lỗi (kèm Config tối thiểu, lệnh đã chạy, output `--verbose`); 1–2 dòng link
    `CONTRIBUTING.md`.
13. **Acknowledgements**: bản rút gọn của Prior Art (một đoạn + danh sách link).
14. **License** — mục cuối cùng.

Chiều dài mục tiêu: 150–250 dòng. Vượt 100 dòng thì GitHub "Outline" đã đủ làm mục lục; một TOC tay ngắn (chỉ `##`) là
tuỳ chọn.

## 5. Anti-pattern cần tránh

- **Trộn hướng dẫn cho contributor vào README người dùng** (build, test, release, `mise install`) — không README nào trong
  nhóm khảo sát làm vậy; tách sang `CONTRIBUTING.md`.
- **Chèn sponsor/prior art/badge dài trước Install** như pnpm — hợp lý khi có site docs, không hợp với `ap`.
- **Chỉ có link, không có ví dụ** (kiểu Terraform/chezmoi) khi chưa có site docs — người dùng không thấy Config trông ra
  sao.
- **Ví dụ không có output** hoặc Config mẫu không chạy được, không khớp schema; code mẫu không được kiểm tra
  (standard-readme: code examples nên được lint, không có link hỏng).
- **Dạy `ap sync` trực tiếp lên Scope `user` trước khi dạy `--dry-run`** — đi ngược clig.dev về dry run cho thay đổi lớn.
- **Giấu Uninstall/Update** ở cuối file hoặc ở docs khác (clig.dev: đặt ngay sau install).
- **Chép lại toàn bộ `--help`** vào README — dễ lệch phiên bản; chỉ nêu flags phổ biến và chỉ sang `--help`.
- **Link tuyệt đối tới file trong repo** thay vì link tương đối (GitHub Docs) và thuật ngữ lệch `CONTEXT.md` (ví dụ gọi
  Preset là "template", Config là "manifest").
- **Short description khác nhau** giữa README, `package.json` và About của repo.
