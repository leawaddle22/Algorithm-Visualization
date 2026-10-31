const syntaxToken = /\b(?:def|for|while|in|and|if|return)\b|\b(?:range|len|insertion_sort|bubble_sort|selection_sort)\b|\b\d+\b/g;

export function renderCode(container, lines, activeLine, highlightSyntax = true) {
  container.replaceChildren(...lines.map((line, index) => {
    const row = document.createElement('span');
    row.className = `line${index + 1 === activeLine ? ' active' : ''}`;
    const number = document.createElement('span');
    number.className = 'ln';
    number.textContent = String(index + 1);
    row.append(number);

    if (!highlightSyntax) {
      row.append(document.createTextNode(line));
      return row;
    }

    let offset = 0;
    for (const match of line.matchAll(syntaxToken)) {
      const token = match[0];
      const start = match.index;
      if (start > offset) row.append(document.createTextNode(line.slice(offset, start)));

      const highlighted = document.createElement('b');
      highlighted.className = /^\d+$/.test(token)
        ? 'num'
        : /^(def|for|while|in|and|if|return)$/.test(token)
          ? 'kw'
          : 'fn';
      highlighted.textContent = token;
      row.append(highlighted);
      offset = start + token.length;
    }
    if (offset < line.length) row.append(document.createTextNode(line.slice(offset)));
    return row;
  }));
}
