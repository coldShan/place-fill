import { splitHighlight } from "../lib/record-search";

export function Highlight(props: { text: string; query: string }) {
  return (
    <>
      {splitHighlight(props.text, props.query).map(function (segment, index) {
        return segment.match ? <mark key={index} class="dm-mark">{segment.text}</mark> : segment.text;
      })}
    </>
  );
}
