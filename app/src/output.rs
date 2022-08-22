pub const LINESTARTS: [&str; 5] = ["The", "Sentence", "Module", "New", "Term"];

pub struct AthenaOutput {
    inner: String,
    file_name: String,
}

impl AthenaOutput {
    pub fn new(s: String, name: String) -> Self {
        let mut sself = Self {
            inner: s,
            file_name: name,
        };
        // sself.rm_repl_start_text();
        // sself.add_newlines();
        sself.set_start_lines_to_file_name();
        sself
    }

    pub fn set_start_lines_to_file_name(&mut self) {
        let outp = self.inner();

        let first_line_with_fname = outp
            .lines()
            .enumerate()
            .find(|(_idx, l)| l.contains(&format!("{}", self.file_name)))
            .unwrap();

        let outp = outp
            .lines()
            .enumerate()
            .filter_map(|(idx, l)| {
                if idx > first_line_with_fname.0 {
                    Some(format!("{}\n", l))
                } else {
                    None
                }
            })
            .collect::<String>();
        self.inner = outp;
    }

    pub fn inner(&self) -> String {
        self.inner.clone()
    }

    fn rm_repl_start_text(&mut self) {
        let mut output = self.inner.clone();
        if let Some(first_line_num) = output.lines().position(|l| l.contains("Loading")) {
            let last_line_num = output
                .lines()
                .collect::<Vec<_>>()
                .iter()
                .rposition(|&l| l.contains("Loading"))
                .unwrap();

            output = output
                .lines()
                .enumerate()
                .filter_map(|(idx, l)| {
                    if (idx >= first_line_num && idx < last_line_num)
                        || (idx <= last_line_num && idx > first_line_num)
                    {
                        None
                    } else {
                        Some(l)
                    }
                })
                .skip(9)
                .collect::<String>();
        }
        self.inner = output;
    }

    fn add_newlines(&mut self) {
        let output = &self.inner;
        let fin = fmt_forward(output.as_str());

        self.inner = fin;
    }
}

fn fmt_forward(s: &str) -> String {
    let mut fin = s.to_string();
    for pat in LINESTARTS {
        fin = fin
            .split(pat)
            .map(|s| {
                if s.starts_with(' ') {
                    format!("\n{}{}", pat, s)
                } else {
                    s.to_string()
                }
            })
            .collect();

        //fin = newline_at_start_of(pat, fin.as_str());
    }
    fin[..fin.len() - 9].to_string()
}
