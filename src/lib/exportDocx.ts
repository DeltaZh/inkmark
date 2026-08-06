import {
  Document,
  HeadingLevel,
  Packer,
  Paragraph,
  TextRun,
} from 'docx';

function headingLevel(level: number): (typeof HeadingLevel)[keyof typeof HeadingLevel] {
  switch (level) {
    case 1:
      return HeadingLevel.HEADING_1;
    case 2:
      return HeadingLevel.HEADING_2;
    case 3:
      return HeadingLevel.HEADING_3;
    case 4:
      return HeadingLevel.HEADING_4;
    case 5:
      return HeadingLevel.HEADING_5;
    default:
      return HeadingLevel.HEADING_6;
  }
}

/** 将 Markdown 粗粒度转为 Word 段落（标题 / 列表 / 正文）。 */
export async function markdownToDocxBytes(markdown: string): Promise<number[]> {
  const lines = markdown.replace(/\r\n/g, '\n').split('\n');
  const children: Paragraph[] = [];

  for (const raw of lines) {
    const line = raw.trimEnd();
    if (!line.trim()) {
      children.push(new Paragraph({ children: [] }));
      continue;
    }

    const heading = /^(#{1,6})\s+(.*)$/.exec(line);
    if (heading) {
      const level = heading[1].length;
      children.push(
        new Paragraph({
          heading: headingLevel(level),
          children: [new TextRun(heading[2])],
        }),
      );
      continue;
    }

    const bullet = /^[-*+]\s+(.*)$/.exec(line);
    if (bullet) {
      children.push(
        new Paragraph({
          children: [new TextRun(`• ${bullet[1]}`)],
        }),
      );
      continue;
    }

    const ordered = /^\d+\.\s+(.*)$/.exec(line);
    if (ordered) {
      children.push(
        new Paragraph({
          children: [new TextRun(ordered[1])],
        }),
      );
      continue;
    }

    children.push(
      new Paragraph({
        children: [new TextRun(line)],
      }),
    );
  }

  if (!children.length) {
    children.push(new Paragraph({ children: [new TextRun('')] }));
  }

  const doc = new Document({
    sections: [{ children }],
  });

  const blob = await Packer.toBlob(doc);
  const buf = new Uint8Array(await blob.arrayBuffer());
  return Array.from(buf);
}
