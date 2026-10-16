import { render } from "preact";
import { App } from "./app";
import "./style.css";

const mountNode = document.getElementById("app");
if (mountNode) render(<App />, mountNode);
