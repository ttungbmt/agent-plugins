# File gốc dùng `kind: Config`

File `agent-plugins.yaml` ở root dùng `kind: Config` (schema `config.schema.json`). `Manifest` bị loại vì Claude Code đã dùng "manifest" cho `plugin.json`/`marketplace.json` — đúng loại file repo này sinh ra; `Project` bị loại vì trùng với scope `project`, trong khi Config có thể được áp dụng ở scope `local`/`user`. `Profile` cũng được cân nhắc nhưng dễ bị hiểu nhầm là profile người dùng.
