var n, t$1, r$1, u$2, f$1, o$2, e$1, l$1, c$1, a$1, h$1 = {}, p$1 = [], v$1 = /^m(i|n|o|s|text|space)$/, y$1 = Array.isArray, d$1 = p$1.slice, w = Object.assign;
function _$1(n2) {
  n2 && n2.parentNode && n2.remove();
}
function b$1(i2, r2, u2, f2, o2) {
  var e2 = { type: i2, props: r2, key: u2, ref: f2, __k: null, __: null, __b: 0, __e: null, __c: null, constructor: void 0, __v: o2 || ++t$1, __i: -1, __u: 0 };
  return !o2 && n.vnode && n.vnode(e2), e2;
}
function M(n2) {
  return n2.children;
}
function $(n2, t2) {
  this.props = n2, this.context = t2, this.__g = 0;
}
function x(n2, t2) {
  if (null == t2) return n2.__ ? x(n2.__, n2.__i + 1) : null;
  for (var i2; t2 < n2.__k.length; t2++) if ((i2 = n2.__k[t2]) && i2.__e) return i2.__e;
  return "function" != typeof n2.type || n2.props.__P ? null : x(n2);
}
function S(n2) {
  if ((n2 = n2.__) && n2.__c && !n2.props.__P) return n2.__e = null, n2.__k.some(function(t2) {
    return t2 && (n2.__e = t2.__e);
  }), S(n2);
}
function C$1(t2) {
  (8 & t2.__g || !(t2.__g |= 8) || !r$1.push(t2) || f$1++) && u$2 == n.debounceRendering || ((u$2 = n.debounceRendering) || queueMicrotask)(j$1);
}
function j$1() {
  var t2, i2, u2, e2, l2, c2, a2, s2, h2;
  try {
    for (i2 = 1; r$1.length; ) r$1.length > i2 && r$1.sort(o$2), t2 = r$1.shift(), i2 = r$1.length, 8 & t2.__g && (e2 = void 0, l2 = void 0, c2 = (l2 = (u2 = t2).__v).__e, a2 = [], s2 = [], (h2 = u2.__P) && ((e2 = w({ constructor: void 0 }, l2)).__v = l2.__v + 1, n.vnode && n.vnode(e2), N(h2, e2, l2, u2.__n, h2.namespaceURI, 32 & l2.__u ? [c2] : null, a2, c2 || x(l2), 32 & l2.__u, s2), e2.__v = l2.__v, e2.__.__k[e2.__i] = e2, z$1(a2, e2, s2), l2.__ = l2.__e = null, e2.__e != c2 && S(e2)));
  } finally {
    r$1.length = f$1 = 0;
  }
}
function L(n2, t2, i2, r2, u2, f2, o2, e2, l2, c2, a2) {
  var s2, v2, y2, d2, w2, _2, g2 = r2.__k || p$1, k2 = t2.length;
  for (l2 = H(i2, t2, g2, l2, k2), s2 = 0; s2 < k2; s2++) null != (y2 = i2.__k[s2]) && (v2 = ~y2.__i && g2[y2.__i] || h$1, y2.__i = s2, _2 = N(n2, y2, v2, u2, f2, o2, e2, l2, c2, a2), d2 = y2.__e, (v2.ref != y2.ref || 8 & v2.__u) && (v2.ref && D$1(v2.ref, null, y2, v2), y2.ref && a2.push(y2.ref, y2.__c || d2, y2)), w2 = w2 || d2, 4 & y2.__u ? (l2 = I(y2, l2, n2, !v2.__v), v2.__e && (v2.__e = null)) : "function" == typeof y2.type && void 0 !== _2 ? l2 = _2 : d2 && (l2 = d2.nextSibling), y2.__u &= -7);
  return i2.__e = w2, l2;
}
function H(n2, t2, i2, r2, u2) {
  var f2, o2, e2, l2, c2, a2, s2, h2, p2, v2, d2 = i2.length, w2 = d2, _2 = 0, g2 = false, k2 = n2.__k = Array(u2);
  for (f2 = 0; f2 < u2; f2++) null != (o2 = t2[f2]) && "boolean" != typeof o2 && "function" != typeof o2 ? ("object" != typeof o2 || o2.constructor == String ? o2 = k2[f2] = b$1(null, o2) : y$1(o2) ? o2 = k2[f2] = b$1(M, { children: o2 }) : void 0 === o2.constructor && o2.__b ? o2 = k2[f2] = b$1(o2.type, o2.props, o2.key, o2.ref, o2.__v) : k2[f2] = o2, l2 = f2 + _2, o2.__ = n2, o2.__b = n2.__b + 1, e2 = null, ~(c2 = o2.__i = O(o2, i2, l2, w2)) && (w2--, (e2 = i2[c2]) && (e2.__u |= 2)), e2 && e2.__v ? (o2.__u |= 2, c2 == l2 - 1 ? _2-- : c2 == l2 + 1 ? _2++ : c2 != l2 && (c2 > l2 ? _2-- : _2++, g2 = true)) : (~c2 || (u2 > d2 ? _2-- : u2 < d2 && _2++), "function" != typeof o2.type && (o2.__u |= 4))) : k2[f2] = null;
  if (g2) {
    for (a2 = [], s2 = [], f2 = 0; f2 < u2; f2++) if ((o2 = k2[f2]) && 2 & o2.__u) {
      for (h2 = 0, p2 = a2.length; h2 < p2; ) a2[v2 = h2 + p2 >> 1] < o2.__i ? h2 = v2 + 1 : p2 = v2;
      a2[h2] = o2.__i, s2[f2] = h2 + 1;
    }
    for (_2 = a2.length; f2--; ) s2[f2] && (s2[f2] == _2 ? _2-- : k2[f2].__u |= 4);
  }
  if (w2) for (f2 = 0; f2 < d2; f2++) !(e2 = i2[f2]) || 2 & e2.__u || (e2.__e == r2 && (r2 = x(e2)), E$1(e2, e2));
  return r2;
}
function I(n2, t2, i2, r2) {
  var u2, f2, o2;
  if ("function" == typeof n2.type) {
    if (n2.props.__P) return t2;
    if (u2 = n2.__k) for (f2 = 0; f2 < u2.length; f2++) u2[f2] && (u2[f2].__ = n2, t2 = I(u2[f2], t2, i2, false));
    return t2;
  }
  for (t2 && !t2.parentNode && (t2 = x(n2)) && !t2.parentNode && (t2 = null), o2 = t2; o2 && 8 == o2.nodeType; ) o2 = o2.nextSibling;
  for (n2.__e != o2 && (!r2 && i2.moveBefore && n2.__e.parentNode ? i2.moveBefore(n2.__e, t2) : i2.insertBefore(n2.__e, t2 || null)), t2 = n2.__e; (t2 = t2 && t2.nextSibling) && 8 == t2.nodeType; ) ;
  return t2;
}
function O(n2, t2, i2, r2) {
  var u2, f2, o2, e2 = n2.key, l2 = n2.type, c2 = t2[i2], a2 = c2 && !(2 & c2.__u);
  if (null === c2 && null == e2 || a2 && e2 == c2.key && l2 == c2.type) return i2;
  if (r2 > (a2 ? 1 : 0)) {
    for (u2 = i2 - 1, f2 = i2 + 1; u2 >= 0 || f2 < t2.length; ) if ((c2 = t2[o2 = u2 >= 0 ? u2-- : f2++]) && !(2 & c2.__u) && e2 == c2.key && l2 == c2.type) return o2;
  }
  return -1;
}
function P(n2, t2, i2) {
  null == i2 && (i2 = ""), "-" == t2[0] ? n2.setProperty(t2, i2) : n2[t2] = i2;
}
function T$1(n2, t2, i2, r2, u2) {
  var f2, o2;
  n: if ("style" == t2) if ("string" == typeof i2) n2.style.cssText = i2;
  else {
    if ("string" == typeof r2 && (n2.style.cssText = r2 = ""), r2) for (t2 in r2) i2 && t2 in i2 || P(n2.style, t2, "");
    if (i2) for (t2 in i2) r2 && i2[t2] == r2[t2] || P(n2.style, t2, i2[t2]);
  }
  else if ("o" == t2[0] && "n" == t2[1]) (n2.__e || (n2.__e = {}))[t2] = i2, i2 && r2 || (o2 = a$1[t2] || (a$1[t2] = q(t2)), (n2.__a || (n2.__a = {}))[t2] = c$1, f2 = t2 != (t2 = t2.replace(l$1, "$1")), (t2 = t2.slice(2))[0] < "a" && (t2 = t2.toLowerCase()), i2 ? n2.addEventListener(t2, o2, f2) : n2.removeEventListener(t2, o2, f2));
  else {
    if ("http://www.w3.org/2000/svg" == u2) t2 = t2.replace(/xlink(H|:h)/, "h").replace(/sName$/, "s");
    else if ("width" != t2 && "height" != t2 && "href" != t2 && "list" != t2 && "form" != t2 && "tabIndex" != t2 && "download" != t2 && "rowSpan" != t2 && "colSpan" != t2 && "role" != t2 && "popover" != t2 && t2 in n2) try {
      n2[t2] = null == i2 ? "" : i2;
      break n;
    } catch (n3) {
    }
    "function" == typeof i2 || (null == i2 || false === i2 && "-" != t2[4] ? n2.removeAttribute(t2) : n2.setAttribute(t2, "popover" == t2 && 1 == i2 ? "" : i2));
  }
}
function q(t2) {
  return function(i2) {
    if (this.__e) {
      var r2 = this.__e[t2];
      if (null == i2[e$1]) i2[e$1] = c$1++;
      else if (i2[e$1] < this.__a[t2]) return;
      return r2(n.event ? n.event(i2) : i2);
    }
  };
}
function N(t2, i2, r2, u2, f2, o2, e2, l2, c2, a2) {
  var s2, h2, v2, d2, g2, k2, b2, m2, S2, C2, j2, H2, I2, A2, O2, P2, T2, q2, N2, z2, D2 = i2.type;
  if (void 0 !== i2.constructor) return null;
  if (128 & r2.__u && (c2 = 32 & r2.__u, s2 = r2.__c.__z)) {
    if (i2.__u |= c2, h2 = o2 = [], 8 == s2.nodeType) for (v2 = 1, d2 = s2.nextSibling; d2; d2 = d2.nextSibling) {
      if (8 == d2.nodeType) {
        if (d2.data.startsWith("$s")) v2++;
        else if (d2.data.startsWith("/$s") && !--v2) break;
      }
      o2.push(d2);
    }
    else o2.push(s2);
    l2 = o2[0];
  }
  (s2 = n.__b) && s2(i2);
  n: if ("function" == typeof D2) {
    g2 = e2.length;
    try {
      if (C2 = i2.props, j2 = (s2 = D2.prototype) && s2.render, H2 = (s2 = D2.contextType) && u2[s2.__c], I2 = s2 ? H2 ? H2.props.value : s2.__ : u2, r2.__c ? 2 & (k2 = i2.__c = r2.__c).__g && (k2.__g |= 1) : (j2 ? i2.__c = k2 = new D2(C2, I2) : (i2.__c = k2 = new $(C2, I2), k2.constructor = D2, k2.render = F$1), H2 && H2.sub(k2), k2.state || (k2.state = {}), k2.__n = u2, k2.__g |= 8, k2.__h = [], k2.__k = []), j2 && (k2.__s || (k2.__s = k2.state), D2.getDerivedStateFromProps && (k2.__s == k2.state && (k2.__s = w({}, k2.__s)), w(k2.__s, D2.getDerivedStateFromProps(C2, k2.__s)))), b2 = k2.props, m2 = k2.state, k2.__v = i2, r2.__c) {
        if (j2 && !D2.getDerivedStateFromProps && C2 !== b2 && k2.componentWillReceiveProps && k2.componentWillReceiveProps(C2, I2), i2.__v == r2.__v && !(8 & k2.__g) || !(4 & k2.__g) && k2.shouldComponentUpdate && false === k2.shouldComponentUpdate(C2, k2.__s, I2)) {
          i2.__v != r2.__v && (k2.props = C2, k2.state = k2.__s, k2.__g &= -9), i2.__e = r2.__e, i2.__k = r2.__k, i2.__k.some(function(n2) {
            n2 && (n2.__ = i2);
          }), p$1.push.apply(k2.__h, k2.__k), k2.__k = [], k2.__h.length && e2.push(k2), l2 = x(r2);
          break n;
        }
        k2.componentWillUpdate && k2.componentWillUpdate(C2, k2.__s, I2), j2 && k2.componentDidUpdate && k2.__h.push(function() {
          k2.componentDidUpdate(b2, m2, S2);
        });
      } else j2 && !D2.getDerivedStateFromProps && k2.componentWillMount && k2.componentWillMount(), j2 && k2.componentDidMount && k2.__h.push(k2.componentDidMount);
      if (k2.context = I2, k2.props = C2, k2.__P = t2, k2.__g &= -5, A2 = n.__r, O2 = 0, j2) k2.state = k2.__s, k2.__g &= -9, A2 && A2(i2), s2 = k2.render(k2.props, k2.state, k2.context), p$1.push.apply(k2.__h, k2.__k), k2.__k = [];
      else do {
        k2.__g &= -9, A2 && A2(i2), s2 = k2.render(k2.props, k2.state, k2.context), k2.state = k2.__s;
      } while (8 & k2.__g && ++O2 < 25);
      k2.state = k2.__s, k2.getChildContext && (u2 = w({}, u2, k2.getChildContext())), j2 && r2.__c && k2.getSnapshotBeforeUpdate && (S2 = k2.getSnapshotBeforeUpdate(b2, m2)), P2 = s2 && s2.type === M && null == s2.key ? s2.props.children : s2, C2.__P && (s2 = l2, f2 = (t2 = C2.__P).namespaceURI, c2 = o2 = null, r2.props && r2.props.__P != t2 && (r2.__k.some(function(n2) {
        n2 && E$1(n2, n2);
      }), r2.__k = null), l2 = r2.__k ? x(r2, 0) : null), l2 = L(t2, y$1(P2) ? P2 : [P2], i2, r2, u2, f2, o2, e2, l2, c2, a2), C2.__P && (i2.__e = null, l2 = s2), i2.__u &= -161, 128 & r2.__u && (k2.__z = null), h2 && h2.some(_$1), k2.__h.length && e2.push(k2), 1 & k2.__g && (k2.__g &= -4);
    } catch (t3) {
      if (e2.length = g2, i2.__v = null, c2 || o2) if (t3.then) {
        if (T2 = 0, i2.__u |= c2 ? 160 : 128, o2) {
          for (~(N2 = o2.indexOf(l2 || void 0)) || (N2 = o2.length); (z2 = o2[N2 - 1]) && 8 == z2.nodeType; ) N2--;
          for (; N2 < o2.length; N2++) if (z2 = o2[N2]) {
            if (o2[N2] = null, 8 == z2.nodeType) {
              if (z2.data.startsWith("$s")) T2++ || (q2 = z2);
              else if (T2 && z2.data.startsWith("/$s") && !--T2) {
                l2 = z2;
                break;
              }
            } else if (!T2) break;
          }
        }
        if (!q2) {
          for (; l2 && 8 == l2.nodeType && l2.nextSibling; ) l2 = l2.nextSibling;
          q2 = l2;
        }
        i2.__c.__z || (i2.__c.__z = q2), i2.__e = l2;
      } else o2 && o2.some(_$1);
      else i2.__e = r2.__e;
      i2.__k || (i2.__k = r2.__k || []), t3.then || V(i2), n.__e(t3, i2, r2);
    }
  } else l2 = i2.__e = B$1(r2.__e, i2, r2, u2, f2, o2, e2, c2, a2, t2);
  return (s2 = n.diffed) && s2(i2), 128 & i2.__u ? void 0 : l2;
}
function V(n2) {
  n2 && (n2.__c && (n2.__c.__g |= 4), n2.__k && n2.__k.some(V));
}
function z$1(t2, i2, r2) {
  for (var u2 = 0; u2 < r2.length; ) D$1(r2[u2++], r2[u2++], r2[u2++]);
  n.__c && n.__c(i2, t2), t2.some(function(i3) {
    try {
      t2 = i3.__h, i3.__h = [], t2.some(function(n2) {
        n2.call(i3);
      });
    } catch (t3) {
      n.__e(t3, i3.__v);
    }
  });
}
function B$1(t2, i2, r2, u2, f2, o2, e2, l2, c2, a2) {
  var s2, p2, w2, g2, k2, b2, m2, M2, $2, S2 = r2.props || h$1, C2 = i2.props, j2 = i2.type;
  if ("svg" == j2 ? f2 = "http://www.w3.org/2000/svg" : "math" == j2 ? f2 = "http://www.w3.org/1998/Math/MathML" : f2 || (f2 = "http://www.w3.org/1999/xhtml"), o2) {
    for (s2 = 0; s2 < o2.length; s2++) if ((k2 = o2[s2]) && (j2 ? k2.localName == j2 : 3 == k2.nodeType)) {
      t2 = k2, o2[s2] = null;
      break;
    }
  }
  if (!t2) {
    if (M2 = a2.ownerDocument || document, !j2) return M2.createTextNode(C2);
    t2 = M2.createElementNS(f2, j2, C2.is && C2), l2 && (n.__m && n.__m(i2, o2), l2 = false), o2 = null;
  }
  if (j2) {
    if (a2 = "template" == j2 ? t2.content : t2, o2 = "textarea" == j2 && null != C2.defaultValue ? null : o2 && d$1.call(a2.childNodes), !l2 && o2) for (S2 = {}, s2 = 0; s2 < t2.attributes.length; s2++) S2[(k2 = t2.attributes[s2]).name] = k2.value;
    for (s2 in S2) k2 = S2[s2], "dangerouslySetInnerHTML" == s2 ? w2 = k2 : "children" == s2 || s2 in C2 || "value" == s2 && "defaultValue" in C2 || "checked" == s2 && "defaultChecked" in C2 || T$1(t2, s2, null, k2, f2);
    for (s2 in $2 = 1 & r2.__u, C2) k2 = C2[s2], "children" == s2 ? g2 = k2 : "dangerouslySetInnerHTML" == s2 ? p2 = k2 : "value" == s2 ? b2 = k2 : "checked" == s2 ? m2 = k2 : l2 && "function" != typeof k2 || !(S2[s2] !== k2 || $2 && null != k2) || T$1(t2, s2, k2, S2[s2], f2);
    p2 ? (l2 || w2 && (p2.__html == w2.__html || p2.__html == t2.innerHTML) || (t2.innerHTML = p2.__html), i2.__k = []) : (w2 && (t2.textContent = ""), ("foreignObject" == j2 || "http://www.w3.org/1998/Math/MathML" == f2 && v$1.test(j2)) && (f2 = "http://www.w3.org/1999/xhtml"), L(a2, y$1(g2) ? g2 : [g2], i2, r2, u2, f2, o2, e2, o2 ? o2[0] : r2.__k && x(r2, 0), l2, c2), o2 && o2.some(_$1)), l2 && "textarea" != j2 || (s2 = "value", "progress" == j2 && null == b2 ? t2.removeAttribute(s2) : null == b2 || b2 === t2[s2] && ("progress" != j2 || b2) || T$1(t2, s2, b2, S2[s2], f2), s2 = "checked", null != m2 && m2 != t2[s2] && T$1(t2, s2, m2, S2[s2], f2));
  } else S2 === C2 || l2 && t2.data == C2 || (t2.data = C2);
  return t2;
}
function D$1(t2, i2, r2, u2) {
  try {
    "function" == typeof t2 ? i2 ? i2.__x = t2(i2) || 1 : u2 && (u2 = u2.__c || u2.__e) && (i2 = u2.__x) && (u2.__x = null, "function" == typeof i2 ? i2() : t2(null)) : t2.current = i2;
  } catch (t3) {
    n.__e(t3, r2);
  }
}
function E$1(t2, i2, r2) {
  var u2, f2;
  if (n.unmount && n.unmount(t2), !(u2 = t2.ref) || u2.current && u2.current != t2.__e || D$1(u2, null, i2, t2), u2 = t2.__c) {
    if (u2.componentWillUnmount) try {
      u2.componentWillUnmount();
    } catch (t3) {
      n.__e(t3, i2);
    }
    u2.__P = u2.__n = null;
  }
  if (u2 = t2.__k) for (f2 = 0; f2 < u2.length; f2++) u2[f2] && E$1(u2[f2], i2, "function" != typeof t2.type || r2 && !t2.props.__P);
  (u2 = t2.__e) && (r2 || _$1(u2), u2.__e && (u2.__e = null)), t2.__e = t2.__c = t2.__ = null;
}
function F$1(n2, t2, i2) {
  return this.constructor(n2, i2);
}
function G$1(t2, i2) {
  var r2, u2, f2, o2;
  n.__ && n.__(t2, i2), 9 == i2.nodeType && (i2 = i2.documentElement), u2 = (r2 = t2 && 32 & t2.__u) ? null : i2.__k, i2.__k = b$1(M, { children: [t2] }), f2 = [], o2 = [], N(i2, i2.__k, u2 || h$1, h$1, i2.namespaceURI, u2 ? null : i2.firstChild ? d$1.call(i2.childNodes) : null, f2, u2 ? u2.__e : i2.firstChild, r2, o2), z$1(f2, i2.__k, o2), i2.__k.props.children = null;
}
n = { __e: function(n2, t2, i2, r2) {
  for (var u2, o2, e2; t2 = t2.__; ) if ((u2 = t2.__c) && !(1 & u2.__g)) {
    u2.__g |= 4;
    try {
      if ((o2 = u2.constructor) && o2.getDerivedStateFromError && (u2.setState(o2.getDerivedStateFromError(n2)), e2 = 8 & u2.__g), u2.componentDidCatch && (u2.componentDidCatch(n2, r2 || {}), e2 = 8 & u2.__g), e2) return void (u2.__g |= 2);
    } catch (t3) {
      n2 = t3, e2 = 0;
    }
  }
  throw f$1 = 0, n2;
} }, t$1 = 0, $.prototype.setState = function(n2, t2) {
  var i2 = this.__s;
  i2 && i2 != this.state || (i2 = this.__s = w({}, this.state)), "function" == typeof n2 && (n2 = n2(w({}, i2), this.props)), n2 && (w(i2, n2), this.__v && (t2 && this.__k.push(t2), C$1(this)));
}, $.prototype.forceUpdate = function(n2) {
  this.__v && (this.__g |= 4, n2 && this.__h.push(n2), C$1(this));
}, $.prototype.render = M, r$1 = [], f$1 = 0, o$2 = function(n2, t2) {
  return n2.__v.__b - t2.__v.__b;
}, e$1 = /* @__PURE__ */ Symbol(), l$1 = /(PointerCapture)$|Capture$/i, c$1 = 0, a$1 = {};
var o$1 = 0;
function u$1(t2, e2, n$1, f2, u2, i2) {
  e2 || (e2 = {});
  var a2, c2, l2 = e2;
  if ("ref" in l2 && "function" != typeof t2) for (c2 in l2 = {}, e2) "ref" == c2 ? a2 = e2[c2] : l2[c2] = e2[c2];
  var p2 = { type: t2, props: l2, key: n$1, ref: a2, __k: null, __: null, __b: 0, __e: null, __c: null, constructor: void 0, __v: --o$1, __i: -1, __u: 0 };
  return n.vnode && n.vnode(p2), p2;
}
var t, r, u, i, o = Object.is, f = 0, c = [], e = [], a = n, v = a.__b, l = a.__r, m = a.diffed, s = a.__c, h = a.unmount, p = a.__;
function y(n2, t2) {
  a.__h && a.__h(r, n2, f || t2), f = 0;
  var u2 = r.__H || (r.__H = { __: [], __h: [] });
  return n2 >= u2.__.length && u2.__.push({}), u2.__[n2];
}
function d(n2) {
  return f = 1, _(G, n2);
}
function _(n2, u2, i2) {
  var f2 = y(t++, 2);
  if (f2.t = n2, !f2.__c && (f2.__ = [G(void 0, u2), function(n3) {
    var t2 = f2.__N ? f2.__N[0] : f2.__[0], r2 = f2.t(t2, n3);
    o(t2, r2) || (f2.__N = [r2, f2.__[1]], f2.__c.setState({}));
  }], f2.__c = r, !r.__f)) {
    r.__f = true;
    var c2 = r.shouldComponentUpdate;
    r.shouldComponentUpdate = function(n3, t2, r2) {
      var u3 = this.__H;
      if (!u3) return true;
      var i3 = false, f3 = this.props != n3;
      if (u3.__.some(function(n4) {
        n4.__N && (i3 = true, o(n4.__[0], n4.__N[0]) || (f3 = true));
      }), c2) {
        var e2 = c2.call(this, n3, t2, r2);
        return i3 ? e2 || f3 : e2;
      }
      return !i3 || f3;
    };
  }
  return f2.__;
}
function A(n2, u2) {
  var i2 = y(t++, 3);
  !a.__s && E(i2.__H, u2) && (i2.__P = true, i2.__ = n2, i2.u = u2, r.__H.__h.push(i2));
}
function F(n2, u2) {
  var i2 = y(t++, 4);
  !a.__s && E(i2.__H, u2) && (i2.__P = false, i2.__ = n2, i2.u = u2, r.__h.push(i2));
}
function T(n2) {
  return f = 5, b(function() {
    return { current: n2 };
  }, []);
}
function b(n2, r2) {
  var u2 = y(t++, 7);
  return E(u2.__H, r2) && (u2.__ = n2(), u2.__H = r2), u2.__;
}
function j(n2, t2) {
  return f = 8, b(function() {
    return n2;
  }, t2);
}
function g() {
  var n2;
  do {
    for (; n2 = e.shift(); ) try {
      C(n2);
    } catch (t3) {
      a.__e(t3, { __: (n2 = n2.__P) && n2.__v });
    }
    for (; n2 = c.shift(); ) {
      var t2 = n2.__H;
      if (n2.__P && t2) try {
        t2.__h.some(C), t2.__h.some(D), t2.__h = [];
      } catch (r2) {
        t2.__h = [], a.__e(r2, n2.__v);
      }
    }
  } while (e.length);
}
a.__b = function(n2) {
  r = null, v && v(n2);
}, a.__ = function(n2, t2) {
  n2 && t2.__k && t2.__k.__m && (n2.__m = t2.__k.__m), p && p(n2, t2);
}, a.__r = function(n2) {
  l && l(n2), t = 0;
  var i2 = (r = n2.__c).__H;
  i2 && (u == r ? r.__h = [] : (i2.__h.some(C), i2.__h.some(D), t = 0), i2.__h = [], i2.__.some(function(n3) {
    n3.__N && (n3.__ = n3.__N), n3.u = n3.__N = void 0;
  })), u = r;
}, a.diffed = function(n2) {
  m && m(n2);
  var t2 = n2.__c;
  t2 && t2.__H && (t2.__H.__h.length && B(c.push(t2)), t2.__H.__.some(function(n3) {
    n3.u && (n3.__H = n3.u);
  })), u = r = null;
}, a.__c = function(n2, t2) {
  t2.some(function(n3) {
    try {
      n3.__h.some(C), n3.__h = n3.__h.filter(function(n4) {
        return !n4.__ || D(n4);
      });
    } catch (r2) {
      t2.some(function(n4) {
        n4.__h && (n4.__h = []);
      }), t2 = [], a.__e(r2, n3.__v);
    }
  }), s && s(n2, t2);
}, a.unmount = function(n2) {
  h && h(n2);
  var t2, r2, u2 = n2.__c;
  u2 && u2.__H && (u2.__H.__.some(function(u3) {
    try {
      if (u3.__P && u3.__c) {
        if (void 0 === r2) {
          for (r2 = n2.__; r2 && (!r2.__c || !r2.__c.__P); ) r2 = r2.__;
          r2 = r2 && r2.__c;
        }
        u3.__P = r2, B(e.push(u3));
      } else C(u3);
    } catch (n3) {
      t2 = n3;
    }
  }), u2.__H = void 0, t2 && a.__e(t2, u2.__v));
};
var k = "function" == typeof requestAnimationFrame;
function z(n2) {
  var t2, r2 = function() {
    clearTimeout(u2), k && cancelAnimationFrame(t2), setTimeout(n2);
  }, u2 = setTimeout(r2, 35);
  k && (t2 = requestAnimationFrame(r2));
}
function B(n2) {
  1 != n2 && i == a.requestAnimationFrame || ((i = a.requestAnimationFrame) || z)(g);
}
function C(n2) {
  var t2 = r, u2 = n2.__c;
  "function" == typeof u2 && (n2.__c = void 0, u2()), r = t2;
}
function D(n2) {
  var t2 = r;
  n2.__c = n2.__(), r = t2;
}
function E(n2, t2) {
  return !n2 || n2.length != t2.length || t2.some(function(t3, r2) {
    return !o(t3, n2[r2]);
  });
}
function G(n2, t2) {
  return "function" == typeof t2 ? t2(n2) : t2;
}
const FIELD_DEFINITIONS = [
  { key: "creditCode", label: "统一社会信用代码" },
  { key: "companyName", label: "公司名称" },
  { key: "fullName", label: "姓名" },
  { key: "idNumber", label: "身份证号" },
  { key: "bankCard", label: "银行卡号" },
  { key: "account", label: "账号" },
  { key: "mobile", label: "手机号" },
  { key: "email", label: "邮箱" },
  { key: "landline", label: "固定电话" },
  { key: "address", label: "地址" },
  { key: "postalCode", label: "邮政编码" }
];
const FIELD_KEYS = FIELD_DEFINITIONS.map(function(definition) {
  return definition.key;
});
function getFieldLabel(fieldKey) {
  const definition = FIELD_DEFINITIONS.find(function(item) {
    return item.key === fieldKey;
  });
  return definition ? definition.label : fieldKey;
}
function createEmptyProfile() {
  return Object.fromEntries(
    FIELD_KEYS.map(function(fieldKey) {
      return [fieldKey, ""];
    })
  );
}
function normalizeProfile(profile) {
  const nextProfile = createEmptyProfile();
  FIELD_KEYS.forEach(function(fieldKey) {
    const value = profile && typeof profile[fieldKey] === "string" ? profile[fieldKey] : "";
    nextProfile[fieldKey] = String(value || "");
  });
  return nextProfile;
}
function formatProfileForCopy(profile) {
  const normalized = normalizeProfile(profile);
  return FIELD_DEFINITIONS.map(function(definition) {
    return definition.label + "：" + normalized[definition.key];
  }).join("\n");
}
const GENERATED_PROFILES_STORAGE_KEY = "ctdp.generatedProfiles.v1";
const FAVORITE_PROFILES_STORAGE_KEY = "ctdp.favoriteProfiles.v1";
const MAX_GENERATED_RECORDS = 30;
function getStorageArea$2(env) {
  try {
    if (typeof chrome !== "undefined" && chrome.storage && chrome.storage.local) return chrome.storage.local;
  } catch (_error) {
  }
  return null;
}
function readStorageValue$1(storageArea, key) {
  if (!storageArea) return Promise.resolve(void 0);
  return new Promise(function(resolve) {
    storageArea.get([key], function(result) {
      resolve(result ? result[key] : void 0);
    });
  });
}
function writeStorageValue$1(storageArea, key, value) {
  if (!storageArea) return Promise.resolve();
  return new Promise(function(resolve) {
    storageArea.set({ [key]: value }, function() {
      resolve();
    });
  });
}
function normalizeTimestamp(value) {
  const raw = String(value || "").trim();
  return /^\d+$/.test(raw) ? raw : "0";
}
function normalizeId(value) {
  const raw = String(value || "").trim();
  return raw || "record-0";
}
function createId(now, random) {
  return String(now) + "-" + Math.floor(random() * 1e6).toString(36);
}
function createUniqueId(now, random, usedIds) {
  const baseId = createId(now, random);
  let id = baseId;
  for (let suffix = 1; usedIds.has(id); suffix += 1) id = baseId + "-" + suffix;
  usedIds.add(id);
  return id;
}
function collectIds(entries) {
  return new Set(entries.map(function(entry) {
    return entry.id;
  }));
}
function normalizeScopeKey(value) {
  const normalized = String(value || "").trim().toLowerCase();
  if (!normalized) return "";
  if (normalized.includes("://")) return "";
  if (/[/?#]/.test(normalized)) return "";
  if (!/^[a-z0-9.\-:]+$/i.test(normalized)) return "";
  return normalized;
}
function normalizeGeneratedProfilesMap(rawValue) {
  if (!rawValue || typeof rawValue !== "object" || Array.isArray(rawValue)) return {};
  const nextMap = {};
  Object.entries(rawValue).forEach(function([scope, entries]) {
    const normalizedScope = normalizeScopeKey(scope);
    if (!normalizedScope || !Array.isArray(entries)) return;
    nextMap[normalizedScope] = entries.filter(function(entry) {
      return !!entry && typeof entry === "object" && !Array.isArray(entry);
    }).map(function(entry) {
      const current = entry;
      return {
        createdAt: normalizeTimestamp(current.createdAt),
        id: normalizeId(current.id),
        profile: normalizeProfile(current.profile)
      };
    }).sort(function(left, right) {
      return Number(right.createdAt) - Number(left.createdAt);
    }).slice(0, MAX_GENERATED_RECORDS);
  });
  return nextMap;
}
function normalizeFavoriteProfilesMap(rawValue) {
  if (!rawValue || typeof rawValue !== "object" || Array.isArray(rawValue)) return {};
  const nextMap = {};
  Object.entries(rawValue).forEach(function([scope, entries]) {
    const normalizedScope = normalizeScopeKey(scope);
    if (!normalizedScope || !Array.isArray(entries)) return;
    nextMap[normalizedScope] = entries.filter(function(entry) {
      return !!entry && typeof entry === "object" && !Array.isArray(entry);
    }).map(function(entry) {
      const current = entry;
      const createdAt = normalizeTimestamp(current.createdAt);
      const updatedAt = normalizeTimestamp(current.updatedAt || current.createdAt);
      return {
        createdAt,
        id: normalizeId(current.id),
        name: String(current.name || "").trim() || "常用数据",
        note: String(current.note || "").trim(),
        profile: normalizeProfile(current.profile),
        updatedAt
      };
    });
  });
  return nextMap;
}
function isSameProfile(left, right) {
  return FIELD_KEYS.every(function(fieldKey) {
    return left[fieldKey] === right[fieldKey];
  });
}
async function readGeneratedProfilesMap(env) {
  return normalizeGeneratedProfilesMap(await readStorageValue$1(getStorageArea$2(), GENERATED_PROFILES_STORAGE_KEY));
}
async function writeGeneratedProfilesMap(nextMap, env) {
  await writeStorageValue$1(getStorageArea$2(), GENERATED_PROFILES_STORAGE_KEY, nextMap);
}
async function readFavoriteProfilesMap(env) {
  return normalizeFavoriteProfilesMap(await readStorageValue$1(getStorageArea$2(), FAVORITE_PROFILES_STORAGE_KEY));
}
async function writeFavoriteProfilesMap(nextMap, env) {
  await writeStorageValue$1(getStorageArea$2(), FAVORITE_PROFILES_STORAGE_KEY, nextMap);
}
async function readGeneratedProfiles(scope, env) {
  const normalizedScope = normalizeScopeKey(scope);
  if (!normalizedScope) return [];
  const records = await readGeneratedProfilesMap();
  return records[normalizedScope] ? records[normalizedScope].slice() : [];
}
async function readFavoriteProfiles(scope, env) {
  const normalizedScope = normalizeScopeKey(scope);
  if (!normalizedScope) return [];
  const favoritesMap = await readFavoriteProfilesMap();
  return favoritesMap[normalizedScope] ? favoritesMap[normalizedScope].slice() : [];
}
async function reorderFavoriteProfiles(scope, orderedIds, env) {
  const normalizedScope = normalizeScopeKey(scope);
  if (!normalizedScope) return [];
  const favoritesMap = await readFavoriteProfilesMap();
  const currentEntries = favoritesMap[normalizedScope] ? favoritesMap[normalizedScope].slice() : [];
  const entriesById = new Map(currentEntries.map(function(entry) {
    return [entry.id, entry];
  }));
  const nextEntries = [];
  orderedIds.forEach(function(id) {
    const entry = entriesById.get(id);
    if (!entry) return;
    nextEntries.push(entry);
    entriesById.delete(id);
  });
  favoritesMap[normalizedScope] = nextEntries.concat(Array.from(entriesById.values()));
  await writeFavoriteProfilesMap(favoritesMap);
  return favoritesMap[normalizedScope].slice();
}
async function createFavoriteProfile(scope, input, env) {
  const normalizedScope = normalizeScopeKey(scope);
  if (!normalizedScope) {
    throw new Error("Invalid scope");
  }
  const normalizedProfile = normalizeProfile(input.profile);
  const favoritesMap = await readFavoriteProfilesMap();
  const currentEntries = favoritesMap[normalizedScope] ? favoritesMap[normalizedScope].slice() : [];
  const existingFavorite = currentEntries.find(function(entry2) {
    return isSameProfile(entry2.profile, normalizedProfile);
  });
  if (existingFavorite) return existingFavorite;
  const now = Date.now();
  const random = Math.random;
  const entry = {
    createdAt: String(now),
    id: createId(now, random),
    name: String(input.name || "").trim() || "常用数据",
    note: String(input.note || "").trim(),
    profile: normalizedProfile,
    updatedAt: String(now)
  };
  favoritesMap[normalizedScope] = [entry].concat(currentEntries);
  await writeFavoriteProfilesMap(favoritesMap);
  return entry;
}
async function updateFavoriteProfile(scope, id, input, env) {
  const normalizedScope = normalizeScopeKey(scope);
  if (!normalizedScope || !id) return null;
  const now = Date.now();
  const favoritesMap = await readFavoriteProfilesMap();
  const currentEntries = favoritesMap[normalizedScope] ? favoritesMap[normalizedScope].slice() : [];
  const entryIndex = currentEntries.findIndex(function(entry) {
    return entry.id === id;
  });
  if (entryIndex === -1) return null;
  const currentEntry = currentEntries[entryIndex];
  if (!currentEntry) return null;
  const nextEntry = {
    createdAt: currentEntry.createdAt,
    id: currentEntry.id,
    name: String(input.name || "").trim() || currentEntry.name,
    note: Object.prototype.hasOwnProperty.call(input, "note") ? String(input.note || "").trim() : currentEntry.note,
    profile: normalizeProfile(input.profile),
    updatedAt: String(now)
  };
  currentEntries[entryIndex] = nextEntry;
  favoritesMap[normalizedScope] = currentEntries;
  await writeFavoriteProfilesMap(favoritesMap);
  return nextEntry;
}
async function deleteFavoriteProfile(scope, id, env) {
  const normalizedScope = normalizeScopeKey(scope);
  if (!normalizedScope || !id) return false;
  const favoritesMap = await readFavoriteProfilesMap();
  const currentEntries = favoritesMap[normalizedScope] ? favoritesMap[normalizedScope].slice() : [];
  const nextEntries = currentEntries.filter(function(entry) {
    return entry.id !== id;
  });
  if (nextEntries.length === currentEntries.length) return false;
  favoritesMap[normalizedScope] = nextEntries;
  await writeFavoriteProfilesMap(favoritesMap);
  return true;
}
async function createFavoriteFromHistory(scope, historyId, name = "", env) {
  const normalizedScope = normalizeScopeKey(scope);
  if (!normalizedScope || !historyId) return null;
  const records = await readGeneratedProfiles(normalizedScope);
  const historyEntry = records.find(function(entry) {
    return entry.id === historyId;
  });
  if (!historyEntry) return null;
  return createFavoriteProfile(normalizedScope, { name, profile: historyEntry.profile });
}
async function listScopeSummaries(env) {
  const generatedMap = await readGeneratedProfilesMap();
  const favoriteMap = await readFavoriteProfilesMap();
  return Array.from(new Set(Object.keys(generatedMap).concat(Object.keys(favoriteMap)))).sort().map(function(scope) {
    return {
      favorites: (favoriteMap[scope] || []).length,
      history: (generatedMap[scope] || []).length,
      scope
    };
  });
}
async function copyFavoriteToScopes(scope, favoriteId, targetScopes, env) {
  const normalizedScope = normalizeScopeKey(scope);
  if (!normalizedScope || !favoriteId) return null;
  const favoritesMap = await readFavoriteProfilesMap();
  const source = (favoritesMap[normalizedScope] || []).find(function(entry) {
    return entry.id === favoriteId;
  });
  if (!source) return null;
  const targets = Array.from(new Set(targetScopes.map(normalizeScopeKey))).filter(function(target) {
    return !!target && target !== normalizedScope;
  });
  const now = Date.now();
  const random = Math.random;
  const results = targets.map(function(target) {
    const currentEntries = favoritesMap[target] ? favoritesMap[target].slice() : [];
    const exists = currentEntries.some(function(entry) {
      return isSameProfile(entry.profile, source.profile);
    });
    if (exists) return { scope: target, status: "duplicate" };
    const copied = {
      createdAt: String(now),
      id: createUniqueId(now, random, collectIds(currentEntries)),
      name: source.name,
      note: source.note,
      profile: normalizeProfile(source.profile),
      updatedAt: String(now)
    };
    favoritesMap[target] = [copied].concat(currentEntries);
    return { scope: target, status: "created" };
  });
  if (results.some(function(result) {
    return result.status === "created";
  })) {
    await writeFavoriteProfilesMap(favoritesMap);
  }
  return results;
}
async function moveScopeRecords(fromScope, toScope, env) {
  const from = normalizeScopeKey(fromScope);
  const to = normalizeScopeKey(toScope);
  if (!from || !to || from === to) return;
  const now = Date.now();
  const random = Math.random;
  const favoritesMap = await readFavoriteProfilesMap();
  if (Object.prototype.hasOwnProperty.call(favoritesMap, from)) {
    const merged = (favoritesMap[to] || []).slice();
    const usedIds = collectIds(merged);
    (favoritesMap[from] || []).forEach(function(entry) {
      const exists = merged.some(function(current) {
        return isSameProfile(current.profile, entry.profile);
      });
      if (exists) return;
      merged.push(usedIds.has(entry.id) ? { ...entry, id: createUniqueId(now, random, usedIds) } : entry);
      usedIds.add(entry.id);
    });
    favoritesMap[to] = merged;
    delete favoritesMap[from];
    await writeFavoriteProfilesMap(favoritesMap);
  }
  const generatedMap = await readGeneratedProfilesMap();
  if (Object.prototype.hasOwnProperty.call(generatedMap, from)) {
    const merged = (generatedMap[to] || []).slice();
    const usedIds = collectIds(merged);
    (generatedMap[from] || []).forEach(function(entry) {
      merged.push(usedIds.has(entry.id) ? { ...entry, id: createUniqueId(now, random, usedIds) } : entry);
      usedIds.add(entry.id);
    });
    generatedMap[to] = merged.sort(function(left, right) {
      return Number(right.createdAt) - Number(left.createdAt);
    }).slice(0, MAX_GENERATED_RECORDS);
    delete generatedMap[from];
    await writeGeneratedProfilesMap(generatedMap);
  }
}
async function importFavoriteProfiles(scope, inputs, env) {
  const normalizedScope = normalizeScopeKey(scope);
  if (!normalizedScope) throw new Error("Invalid scope");
  const favoritesMap = await readFavoriteProfilesMap();
  const currentEntries = favoritesMap[normalizedScope] ? favoritesMap[normalizedScope].slice() : [];
  const now = Date.now();
  const random = Math.random;
  const created = [];
  const usedIds = collectIds(currentEntries);
  let skipped = 0;
  inputs.forEach(function(input) {
    const profile = normalizeProfile(input.profile);
    const exists = currentEntries.concat(created).some(function(entry) {
      return isSameProfile(entry.profile, profile);
    });
    if (exists) {
      skipped += 1;
      return;
    }
    created.push({
      createdAt: String(now),
      id: createUniqueId(now, random, usedIds),
      name: String(input.name || "").trim() || "常用数据",
      note: String(input.note || "").trim(),
      profile,
      updatedAt: String(now)
    });
  });
  if (created.length) {
    favoritesMap[normalizedScope] = currentEntries.concat(created);
    await writeFavoriteProfilesMap(favoritesMap);
  }
  return { created, skipped };
}
const DATA_MANAGER_PAGE_PATH = "data-manager.html";
function normalizeDataManagerView(value) {
  const normalized = String(value || "").trim().toLowerCase();
  if (normalized === "history" || normalized === "systems") return normalized;
  return "favorites";
}
function normalizeSystemId(value) {
  const normalized = String(value || "").trim().toLowerCase();
  return /^[a-z0-9-]+$/.test(normalized) ? normalized : "";
}
function parseDataManagerPageLocation(search) {
  const params = typeof search === "string" ? new URLSearchParams(search) : search;
  return {
    scope: normalizeScopeKey(params.get("scope") || ""),
    view: normalizeDataManagerView(params.get("view")),
    systemId: normalizeSystemId(params.get("system"))
  };
}
function buildDataManagerPageUrl(baseUrl, scope, view, systemId) {
  const url = new URL(DATA_MANAGER_PAGE_PATH, baseUrl);
  const normalizedScope = normalizeScopeKey(scope);
  const normalizedView = normalizeDataManagerView(view);
  const normalizedSystemId = normalizeSystemId(systemId);
  if (normalizedScope) {
    url.searchParams.set("scope", normalizedScope);
  } else {
    url.searchParams.delete("scope");
  }
  url.searchParams.set("view", normalizedView);
  if (normalizedSystemId) url.searchParams.set("system", normalizedSystemId);
  return url.toString();
}
async function copyText(text2) {
  try {
    await navigator.clipboard.writeText(text2);
    return true;
  } catch (_error) {
    const textarea = document.createElement("textarea");
    textarea.value = text2;
    textarea.setAttribute("readonly", "");
    textarea.style.position = "fixed";
    textarea.style.opacity = "0";
    document.body.appendChild(textarea);
    textarea.select();
    let copied = false;
    try {
      copied = document.execCommand("copy");
    } catch (_execError) {
      copied = false;
    }
    textarea.remove();
    return copied;
  }
}
const FIELD_GROUPS = [
  { title: "个人", fields: ["fullName", "idNumber", "mobile", "email"] },
  { title: "账户", fields: ["bankCard", "account"] },
  { title: "企业", fields: ["companyName", "creditCode"] },
  { title: "联系地址", fields: ["landline", "address", "postalCode"] }
];
const DISPLAY_FIELD_ORDER = FIELD_GROUPS.flatMap(function(group) {
  return group.fields;
});
const COLUMN_PREFERENCES_STORAGE_KEY = "ctdp.dataManagerColumns.v1";
const DEFAULT_COLUMNS = {
  favorites: ["fullName", "idNumber", "mobile", "companyName"],
  history: ["fullName", "idNumber", "mobile", "email", "companyName"]
};
const MONOSPACE_FIELDS = /* @__PURE__ */ new Set([
  "creditCode",
  "idNumber",
  "bankCard",
  "account",
  "mobile",
  "landline",
  "postalCode"
]);
function isMonospaceField(fieldKey) {
  return MONOSPACE_FIELDS.has(fieldKey);
}
function sortColumns(columns) {
  return DISPLAY_FIELD_ORDER.filter(function(fieldKey) {
    return columns.includes(fieldKey);
  });
}
function toggleColumn(columns, fieldKey) {
  if (columns.includes(fieldKey)) {
    return columns.length > 1 ? columns.filter(function(item) {
      return item !== fieldKey;
    }) : columns;
  }
  return sortColumns(columns.concat(fieldKey));
}
function normalizeColumnPreferences(rawValue) {
  const source = rawValue && typeof rawValue === "object" && !Array.isArray(rawValue) ? rawValue : {};
  function readColumns(view) {
    const value = source[view];
    if (!Array.isArray(value)) return DEFAULT_COLUMNS[view].slice();
    const columns = sortColumns(value.filter(function(item) {
      return typeof item === "string" && FIELD_KEYS.includes(item);
    }));
    return columns.length ? columns : DEFAULT_COLUMNS[view].slice();
  }
  return { favorites: readColumns("favorites"), history: readColumns("history") };
}
function formatDisplayTime(value) {
  const timestamp = Number(value);
  if (!Number.isFinite(timestamp) || timestamp <= 0) return "时间未知";
  return new Date(timestamp).toLocaleString("zh-CN");
}
function moveId(ids, id, targetId, placeBefore) {
  if (id === targetId) return ids;
  const next = ids.filter(function(item) {
    return item !== id;
  });
  const targetIndex = next.indexOf(targetId);
  if (targetIndex < 0) return ids;
  next.splice(placeBefore ? targetIndex : targetIndex + 1, 0, id);
  return next;
}
function shiftId(ids, id, offset) {
  const currentIndex = ids.indexOf(id);
  const nextIndex = currentIndex + offset;
  if (currentIndex < 0 || nextIndex < 0 || nextIndex >= ids.length) return null;
  const next = ids.slice();
  next.splice(currentIndex, 1);
  next.splice(nextIndex, 0, id);
  return next;
}
const DEFAULT_FAVORITE_NAME = "常用数据";
function getCustomFavoriteName(name) {
  const trimmed = String(name || "").trim();
  return trimmed === DEFAULT_FAVORITE_NAME ? "" : trimmed;
}
function getFavoriteTitle(entry) {
  return getCustomFavoriteName(entry.name) || entry.profile.fullName || "未命名数据";
}
function tokenizeQuery(query) {
  return String(query || "").toLowerCase().split(/\s+/).filter(Boolean);
}
function matchesQuery(profile, extraTexts, query) {
  const tokens = tokenizeQuery(query);
  if (!tokens.length) return true;
  const haystack = FIELD_KEYS.map(function(fieldKey) {
    return profile[fieldKey];
  }).concat(extraTexts).join("\n").toLowerCase();
  return tokens.every(function(token) {
    return haystack.includes(token);
  });
}
function splitHighlight(text2, query) {
  const value = String(text2 || "");
  const tokens = tokenizeQuery(query);
  if (!value || !tokens.length) return [{ text: value, match: false }];
  const lower = value.toLowerCase();
  const marks = new Array(value.length).fill(false);
  tokens.forEach(function(token) {
    let index = lower.indexOf(token);
    while (index >= 0) {
      for (let offset = 0; offset < token.length; offset += 1) marks[index + offset] = true;
      index = lower.indexOf(token, index + token.length);
    }
  });
  const segments = [];
  for (let index = 0; index < value.length; index += 1) {
    const match = !!marks[index];
    const last = segments[segments.length - 1];
    if (last && last.match === match) {
      last.text += value[index];
    } else {
      segments.push({ text: value[index] || "", match });
    }
  }
  return segments;
}
const EXPORT_FILE_TYPE = "place-fill-data-records";
const EXPORT_FILE_VERSION = 1;
function buildExportPayload(scope, favorites, now) {
  return {
    type: EXPORT_FILE_TYPE,
    version: EXPORT_FILE_VERSION,
    scope,
    exportedAt: now.toISOString(),
    favorites: favorites.map(function(entry) {
      return { name: entry.name, note: entry.note, profile: normalizeProfile(entry.profile) };
    })
  };
}
function pad2(value) {
  return String(value).padStart(2, "0");
}
function buildExportFileName(scope, now) {
  const stamp = String(now.getFullYear()) + pad2(now.getMonth() + 1) + pad2(now.getDate());
  return "place-fill-" + (scope.replace(/[^a-z0-9._-]/gi, "-") || "data") + "-favorites-" + stamp + ".json";
}
function parseImportPayload(text2) {
  let raw;
  try {
    raw = JSON.parse(String(text2 || "").replace(/^﻿/, ""));
  } catch (_error) {
    return { ok: false, error: "文件不是有效的 JSON" };
  }
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) {
    return { ok: false, error: "文件格式不正确，请选择数据管理页导出的文件" };
  }
  const payload = raw;
  if (payload.type !== EXPORT_FILE_TYPE || !Array.isArray(payload.favorites)) {
    return { ok: false, error: "文件格式不正确，请选择数据管理页导出的文件" };
  }
  const favorites = payload.favorites.filter(function(item) {
    return !!item && typeof item === "object" && !Array.isArray(item);
  }).map(function(item) {
    return {
      name: String(item.name || "").trim(),
      note: String(item.note || "").trim(),
      profile: normalizeProfile(item.profile)
    };
  }).filter(function(item) {
    return FIELD_KEYS.some(function(fieldKey) {
      return item.profile[fieldKey] !== "";
    });
  });
  if (!favorites.length) return { ok: false, error: "文件中没有可导入的常用数据" };
  return { ok: true, sourceScope: normalizeScopeKey(String(payload.scope || "")), favorites };
}
function planImport(existing, incoming) {
  const toCreate = [];
  let duplicates = 0;
  incoming.forEach(function(item) {
    const seen = existing.some(function(entry) {
      return isSameProfile(entry.profile, item.profile);
    }) || toCreate.some(function(entry) {
      return isSameProfile(entry.profile, item.profile);
    });
    if (seen) {
      duplicates += 1;
    } else {
      toCreate.push(item);
    }
  });
  return { toCreate, duplicates };
}
const GENERIC_TITLES = ["vite app", "react app", "vue app", "document", "untitled"];
const FILE_SCOPE = "file:local";
const SCOPE_PREFIXES = ["system:", "host:", "legacy:", "file:"];
const IPV4_PATTERN = /^\d{1,3}(?:\.\d{1,3}){3}$/;
const LOCAL_HOSTNAMES = ["localhost", "127.0.0.1", "[::1]", "::1", "0.0.0.0"];
function normalizeHostname(hostname) {
  return String(hostname || "").trim().toLowerCase();
}
function classifyHost(hostname) {
  const host = normalizeHostname(hostname);
  if (!host) {
    return "none";
  }
  if (LOCAL_HOSTNAMES.indexOf(host) !== -1 || host.endsWith(".localhost")) {
    return "local";
  }
  if (IPV4_PATTERN.test(host) || host.indexOf(":") !== -1) {
    return "ip";
  }
  return "domain";
}
function encodeHostname(hostname) {
  const host = normalizeHostname(hostname);
  if (host.indexOf(":") === -1 && host.charAt(0) !== "[") {
    return host;
  }
  const bare = host.replace(/^\[/, "").replace(/\]$/, "");
  return "v6-" + bare.replace(/:/g, "-");
}
function getFallbackScope(info) {
  const kind = classifyHost(info.hostname);
  if (kind === "none") {
    return FILE_SCOPE;
  }
  const encoded = encodeHostname(info.hostname);
  if (kind === "local" && info.port) {
    return "host:" + encoded + ":" + info.port;
  }
  return "host:" + encoded;
}
function buildSystemScope(id) {
  return "system:" + id;
}
function parseScopeKey(scope) {
  const text2 = String(scope || "");
  if (text2.startsWith("file://")) return null;
  for (const prefix of SCOPE_PREFIXES) {
    if (text2.startsWith(prefix)) {
      return { kind: prefix.slice(0, -1), value: text2.slice(prefix.length) };
    }
  }
  return null;
}
function isGenericTitle(title) {
  const normalized = String(title || "").trim().toLowerCase();
  return normalized === "" || GENERIC_TITLES.indexOf(normalized) !== -1;
}
function findOwningSystem(systems, hostname, port) {
  const local = classifyHost(hostname) === "local";
  const encoded = encodeHostname(hostname);
  const owners = systems.filter(function(system) {
    return system.environments.some(function(environment) {
      return encodeHostname(environment.hostname) === encoded && (!local || (environment.port || "") === port);
    });
  });
  return owners.length === 1 ? owners[0] : null;
}
function parseScopeInput(input, currentScope, systems = []) {
  const raw = String(input || "").trim();
  if (!raw) return { scope: "", error: "请输入域名或网址" };
  let url = null;
  try {
    url = new URL(/^[a-z][a-z0-9+.-]*:\/\//i.test(raw) ? raw : "http://" + raw);
  } catch (_error) {
    url = null;
  }
  const hostname = url ? normalizeScopeKey(url.hostname) : "";
  if (!url || !hostname || !hostname.includes(".") && classifyHost(hostname) !== "local") {
    return { scope: "", error: "请输入有效的域名，例如 test.example.com" };
  }
  const owner = findOwningSystem(systems, hostname, url.port);
  const scope = owner ? buildSystemScope(owner.id) : getFallbackScope({ protocol: url.protocol, hostname, port: url.port });
  if (scope === normalizeScopeKey(currentScope)) return { scope: "", error: "不能复制到当前站点" };
  return { scope, error: "" };
}
const TARGET_KIND_ORDER = ["system", "host", "file"];
function targetKindRank(scope) {
  const rank = TARGET_KIND_ORDER.indexOf(parseScopeKey(scope)?.kind || "host");
  return rank === -1 ? TARGET_KIND_ORDER.length : rank;
}
function buildCopyTargets(summaries, systems, currentScope) {
  const byScope = /* @__PURE__ */ new Map();
  summaries.forEach(function(summary) {
    byScope.set(summary.scope, summary);
  });
  systems.forEach(function(system) {
    const scope = buildSystemScope(system.id);
    if (!byScope.has(scope)) byScope.set(scope, { scope, favorites: 0, history: 0 });
  });
  return Array.from(byScope.values()).filter(function(summary) {
    return summary.scope !== currentScope && parseScopeKey(summary.scope)?.kind !== "legacy";
  }).sort(function(left, right) {
    return targetKindRank(left.scope) - targetKindRank(right.scope);
  });
}
function summarizeCopyResults(results, formatLabel = function(scope) {
  return scope;
}) {
  const created = results.filter(function(result) {
    return result.status === "created";
  });
  const skipped = results.filter(function(result) {
    return result.status === "duplicate";
  });
  const skippedNames = skipped.length > 2 ? skipped.slice(0, 2).map(function(result) {
    return formatLabel(result.scope);
  }).join("、") + " 等 " + skipped.length + " 个站点" : skipped.map(function(result) {
    return formatLabel(result.scope);
  }).join("、");
  if (!created.length) {
    return { message: skippedNames + " 已存在相同数据，未重复复制", tone: "warning" };
  }
  const base = "已复制到 " + created.length + " 个站点";
  return skipped.length ? { message: base + "；" + skippedNames + " 已存在相同数据，已跳过", tone: "success" } : { message: base, tone: "success" };
}
const DELETED_SYSTEM_LABEL = "已删除的系统";
const LOCAL_FILE_LABEL = "本地文件";
function formatScopeLabel(scope, systems) {
  const parsed = parseScopeKey(scope);
  if (!parsed) return scope;
  if (parsed.kind === "system") {
    const system = systems.find(function(item) {
      return item.id === parsed.value;
    });
    if (!system) return DELETED_SYSTEM_LABEL;
    return system.name.trim() || "未命名系统";
  }
  if (parsed.kind === "legacy") return parsed.value + "（旧数据）";
  if (parsed.kind === "file") return LOCAL_FILE_LABEL;
  return parsed.value;
}
const SYSTEM_PROFILES_STORAGE_KEY = "ctdp.systemProfiles.v1";
const SITE_FEATURE_STORAGE_KEY = "ctdp.siteFeatureEnabled.v1";
const OVERRIDES_STORAGE_KEY = "ctdp.smartFillOverrides.v1";
const AI_MAPPINGS_STORAGE_KEY = "ctdp.aiFieldMappings.v1";
function getStorageArea$1(env) {
  try {
    if (typeof chrome !== "undefined" && chrome.storage && chrome.storage.local) return chrome.storage.local;
  } catch (_error) {
  }
  return null;
}
function readStorageValue(env, key) {
  const storageArea = getStorageArea$1();
  if (!storageArea) return Promise.resolve(void 0);
  return new Promise(function(resolve) {
    storageArea.get([key], function(result) {
      resolve(result ? result[key] : void 0);
    });
  });
}
function writeStorageValue(env, key, value) {
  const storageArea = getStorageArea$1();
  if (!storageArea) return Promise.resolve();
  return new Promise(function(resolve) {
    storageArea.set({ [key]: value }, function() {
      resolve();
    });
  });
}
function currentTime(env) {
  return Date.now();
}
function generateId(env) {
  if (env && typeof env.createId === "function") return env.createId();
  let raw = "";
  try {
    if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") raw = crypto.randomUUID();
  } catch (_error) {
  }
  if (!raw) raw = Date.now().toString(36) + "-" + Math.floor(Math.random() * 1e9).toString(36);
  return raw.toLowerCase().replace(/[^a-z0-9-]/g, "");
}
function asRecord(value) {
  return value && typeof value === "object" && !Array.isArray(value) ? value : {};
}
function text(value) {
  return typeof value === "string" ? value : "";
}
function normalizeEnvironment(raw) {
  const record = asRecord(raw);
  const hostname = text(record.hostname).trim().toLowerCase();
  if (!hostname) return null;
  const query = {};
  Object.entries(asRecord(record.query)).forEach(function([key, value]) {
    if (typeof value === "string") query[key] = value;
  });
  return {
    id: text(record.id),
    hostname,
    port: text(record.port),
    query,
    lastPath: text(record.lastPath),
    autoAdded: record.autoAdded === true,
    createdAt: Number(record.createdAt) || 0
  };
}
function normalizeAnomaly(raw) {
  const record = asRecord(raw);
  const titleSystemId = text(record.titleSystemId);
  const url = text(record.url);
  if (!titleSystemId || !url) return null;
  return { titleSystemId, url, at: Number(record.at) || 0 };
}
function normalizeSystemProfile(raw) {
  const record = asRecord(raw);
  const id = text(record.id).trim();
  if (!id) return null;
  const environments = (Array.isArray(record.environments) ? record.environments : []).map(normalizeEnvironment).filter(function(item) {
    return item !== null;
  });
  const anomalies = (Array.isArray(record.anomalies) ? record.anomalies : []).map(normalizeAnomaly).filter(function(item) {
    return item !== null;
  });
  return {
    id,
    name: text(record.name),
    titles: (Array.isArray(record.titles) ? record.titles : []).filter(function(item) {
      return typeof item === "string";
    }),
    environments,
    anomalies,
    createdAt: Number(record.createdAt) || 0,
    updatedAt: Number(record.updatedAt) || 0
  };
}
async function readSystems(env) {
  const stored = await readStorageValue(env, SYSTEM_PROFILES_STORAGE_KEY);
  if (!Array.isArray(stored)) return [];
  return stored.map(normalizeSystemProfile).filter(function(item) {
    return item !== null;
  });
}
async function writeSystems(systems, env) {
  await writeStorageValue(env, SYSTEM_PROFILES_STORAGE_KEY, systems);
}
function validateSystems(systems) {
  const owners = /* @__PURE__ */ new Map();
  for (const item of systems) {
    for (const environment of item.environments) {
      if (classifyHost(environment.hostname) === "local" || classifyHost(environment.hostname) === "none") continue;
      const encoded = encodeHostname(environment.hostname);
      const owner = owners.get(encoded);
      if (owner && owner.id !== item.id) {
        return { ok: false, message: environment.hostname + " 已属于系统「" + owner.name + "」" };
      }
      if (!owner) owners.set(encoded, item);
    }
  }
  return { ok: true };
}
function environmentFallbackScope(environment) {
  return getFallbackScope({ hostname: environment.hostname, port: environment.port });
}
async function saveSystem(system, env) {
  const systems = await readSystems(env);
  const index = systems.findIndex(function(item) {
    return item.id === system.id;
  });
  const previousScopes = (index === -1 ? [] : systems[index].environments).map(environmentFallbackScope);
  const others = systems.filter(function(item) {
    return item.id !== system.id;
  });
  const verdict = validateSystems(others.concat([system]));
  if (!verdict.ok) return { ok: false, message: verdict.message };
  const next = { ...system, updatedAt: currentTime() };
  if (index === -1) systems.push(next);
  else systems[index] = next;
  await writeSystems(systems, env);
  const adopted = [];
  for (const environment of system.environments) {
    const fallbackScope = environmentFallbackScope(environment);
    if (previousScopes.indexOf(fallbackScope) !== -1 || adopted.indexOf(fallbackScope) !== -1) continue;
    adopted.push(fallbackScope);
    await adoptFallbackScope(fallbackScope, system.id, env);
  }
  return { ok: true };
}
function recordHasOwn(record, key) {
  return Object.prototype.hasOwnProperty.call(record, key);
}
async function moveKeyPrefix(storageKey, fromScope, toScope, env) {
  const stored = asRecord(await readStorageValue(env, storageKey));
  const fromPrefix = fromScope + "::";
  const toPrefix = toScope + "::";
  const next = {};
  const moved = {};
  let changed = false;
  Object.keys(stored).forEach(function(key) {
    if (key.startsWith(fromPrefix)) {
      moved[toPrefix + key.slice(fromPrefix.length)] = stored[key];
      changed = true;
    } else {
      next[key] = stored[key];
    }
  });
  if (!changed) return;
  Object.keys(moved).forEach(function(key) {
    if (!recordHasOwn(next, key)) next[key] = moved[key];
  });
  await writeStorageValue(env, storageKey, next);
}
async function moveToggle(fromScope, toScope, env) {
  const stored = asRecord(await readStorageValue(env, SITE_FEATURE_STORAGE_KEY));
  if (!recordHasOwn(stored, fromScope)) return;
  const next = { ...stored };
  if (!recordHasOwn(next, toScope)) next[toScope] = stored[fromScope];
  delete next[fromScope];
  await writeStorageValue(env, SITE_FEATURE_STORAGE_KEY, next);
}
async function moveScopeData(fromScope, toScope, env) {
  if (!fromScope || !toScope || fromScope === toScope) return;
  await moveScopeRecords(fromScope, toScope);
  await moveKeyPrefix(OVERRIDES_STORAGE_KEY, fromScope, toScope, env);
  await moveKeyPrefix(AI_MAPPINGS_STORAGE_KEY, fromScope, toScope, env);
  await moveToggle(fromScope, toScope, env);
}
async function deleteSystem(id, targetScope, env) {
  await moveScopeData(buildSystemScope(id), targetScope, env);
  const systems = await readSystems(env);
  await writeSystems(
    systems.filter(function(item) {
      return item.id !== id;
    }),
    env
  );
}
function isLocalFallbackScope(scope) {
  return legacyKeyForFallbackScope(scope) !== "";
}
function legacyKeyForFallbackScope(scope) {
  const parsed = parseScopeKey(scope);
  if (!parsed || parsed.kind !== "host") return "";
  const value = parsed.value;
  let hostname = value;
  if (value.startsWith("v6-")) {
    const lastDash = value.lastIndexOf(":");
    const bare = (lastDash === -1 ? value : value.slice(0, lastDash)).slice(3).replace(/-/g, ":");
    hostname = "[" + bare + "]";
  } else {
    const colon = value.indexOf(":");
    if (colon !== -1) hostname = value.slice(0, colon);
  }
  return classifyHost(hostname) === "local" ? "legacy:" + hostname : "";
}
async function readScopeEnabled(scope, env) {
  const stored = asRecord(await readStorageValue(env, SITE_FEATURE_STORAGE_KEY));
  if (recordHasOwn(stored, scope)) return stored[scope] === true;
  const legacyKey = legacyKeyForFallbackScope(scope);
  return legacyKey ? stored[legacyKey] === true : false;
}
async function adoptFallbackScope(fallbackScope, systemId, env) {
  const systemScope = buildSystemScope(systemId);
  const enabled = await readScopeEnabled(fallbackScope, env);
  await moveScopeData(fallbackScope, systemScope, env);
  const stored = asRecord(await readStorageValue(env, SITE_FEATURE_STORAGE_KEY));
  const next = { ...stored };
  if (!recordHasOwn(next, systemScope)) next[systemScope] = enabled;
  if (isLocalFallbackScope(fallbackScope)) next[fallbackScope] = false;
  await writeStorageValue(env, SITE_FEATURE_STORAGE_KEY, next);
}
async function dismissAnomalies(systemId, env) {
  const systems = await readSystems(env);
  const target = systems.find(function(item) {
    return item.id === systemId;
  });
  if (!target || !target.anomalies.length) return;
  target.anomalies = [];
  await writeSystems(systems, env);
}
const SYSTEM_STATUS_LABELS = {
  enabled: "启用",
  disabled: "已停用",
  anomaly: "异常"
};
const HOSTNAME_PATTERN = /^(?:\[[0-9a-f:]+\]|[a-z0-9](?:[a-z0-9.-]*[a-z0-9])?)$/;
const PORT_PATTERN = /^\d{1,5}$/;
function getSystemStatus(system, enabledMap) {
  if (system.anomalies.length > 0) return "anomaly";
  return enabledMap["system:" + system.id] === true ? "enabled" : "disabled";
}
function formatEnvironmentHost(environment) {
  return environment.hostname + (environment.port ? ":" + environment.port : "");
}
function matchesSystemQuery(system, query) {
  const tokens = tokenizeQuery(query);
  if (!tokens.length) return true;
  const haystack = [system.name].concat(system.titles).concat(
    system.environments.map(function(environment) {
      return formatEnvironmentHost(environment);
    })
  ).join("\n").toLowerCase();
  return tokens.every(function(token) {
    return haystack.includes(token);
  });
}
function countAnnotationsBySystem(overrides) {
  const counts = {};
  if (!overrides || typeof overrides !== "object" || Array.isArray(overrides)) return counts;
  const prefix = "system:";
  Object.keys(overrides).forEach(function(key) {
    if (!key.startsWith(prefix)) return;
    const end = key.indexOf("::");
    if (end <= prefix.length) return;
    const id = key.slice(prefix.length, end);
    counts[id] = (counts[id] || 0) + 1;
  });
  return counts;
}
function getDeleteTargets(system) {
  const scopes = [];
  system.environments.forEach(function(environment) {
    const scope = getFallbackScope({ hostname: environment.hostname, port: environment.port });
    if (!scopes.includes(scope)) scopes.push(scope);
  });
  if (!scopes.length) scopes.push(FILE_SCOPE);
  return scopes.map(function(scope) {
    return { scope, label: formatScopeLabel(scope, []) };
  });
}
function createEnvironmentDraft(environment) {
  return {
    id: environment ? environment.id : "",
    hostname: environment ? environment.hostname : "",
    port: environment ? environment.port : "",
    lastPath: environment ? environment.lastPath : "",
    query: environment ? Object.keys(environment.query).map(function(key) {
      return { key, value: environment.query[key] || "" };
    }) : [],
    autoAdded: environment ? environment.autoAdded : false,
    createdAt: environment ? environment.createdAt : 0
  };
}
function createBlankEnvironmentDraft() {
  return createEnvironmentDraft(null);
}
function createSystemDraft(system) {
  if (!system) return { name: "", titles: [], environments: [createEnvironmentDraft(null)] };
  return {
    name: system.name,
    titles: system.titles.slice(),
    environments: system.environments.map(createEnvironmentDraft)
  };
}
function cleanTitles(titles) {
  const result = [];
  titles.forEach(function(title) {
    const value = title.trim();
    if (value && !result.includes(value)) result.push(value);
  });
  return result;
}
function cleanLastPath(value) {
  return value.trim().replace(/^\/+|\/+$/g, "");
}
function cleanQuery(rows) {
  return rows.map(function(row) {
    return { key: row.key.trim(), value: row.value.trim() };
  }).filter(function(row) {
    return row.key !== "" || row.value !== "";
  });
}
function validateSystemDraft(draft) {
  if (!draft.name.trim()) return "请填写系统名称";
  const generic = cleanTitles(draft.titles).find(isGenericTitle);
  if (generic) return "「" + generic + "」属于通用标题，不能作为标题关键词";
  if (!draft.environments.length) return "至少需要一条环境记录";
  for (let index = 0; index < draft.environments.length; index += 1) {
    const environment = draft.environments[index];
    const label = "环境 " + (index + 1);
    const hostname = environment.hostname.trim().toLowerCase();
    if (!hostname) return label + " 的 hostname 不能为空";
    if (!HOSTNAME_PATTERN.test(hostname)) return label + " 的 hostname 无效，请只填写主机名，例如 test.example.com";
    const port = environment.port.trim();
    if (port && !PORT_PATTERN.test(port)) return label + " 的端口必须是数字";
    if (cleanLastPath(environment.lastPath).includes("/")) return label + " 的末端 path 只需填写最后一段";
    const seen = /* @__PURE__ */ new Set();
    for (const row of cleanQuery(environment.query)) {
      if (!row.key) return label + " 的标识参数缺少参数名";
      if (seen.has(row.key)) return label + " 的参数名「" + row.key + "」重复";
      seen.add(row.key);
    }
  }
  return "";
}
function buildSystemFromDraft(draft, existing, options = {}) {
  const createId2 = options.createId || generateId;
  const now = (options.now || Date.now)();
  return {
    id: existing ? existing.id : createId2(),
    name: draft.name.trim(),
    titles: cleanTitles(draft.titles),
    environments: draft.environments.map(function(environment) {
      const query = {};
      cleanQuery(environment.query).forEach(function(row) {
        query[row.key] = row.value;
      });
      const isNew = !environment.id;
      return {
        id: isNew ? createId2() : environment.id,
        hostname: environment.hostname.trim().toLowerCase(),
        port: environment.port.trim(),
        query,
        lastPath: cleanLastPath(environment.lastPath),
        autoAdded: isNew ? false : environment.autoAdded,
        createdAt: isNew ? now : environment.createdAt
      };
    }),
    anomalies: existing ? existing.anomalies : [],
    createdAt: existing ? existing.createdAt : now,
    updatedAt: existing ? existing.updatedAt : now
  };
}
function canonicalDraft(draft) {
  return JSON.stringify({
    name: draft.name.trim(),
    titles: cleanTitles(draft.titles),
    environments: draft.environments.map(function(environment) {
      return {
        id: environment.id,
        hostname: environment.hostname.trim().toLowerCase(),
        port: environment.port.trim(),
        lastPath: cleanLastPath(environment.lastPath),
        query: cleanQuery(environment.query)
      };
    })
  });
}
function isSameSystemDraft(left, right) {
  return canonicalDraft(left) === canonicalDraft(right);
}
function Icon(props) {
  const iconAssets = typeof window !== "undefined" ? window.ChromeTestDataIconAssets : void 0;
  const url = iconAssets?.getIconAssetUrl ? iconAssets.getIconAssetUrl(props.name) : "";
  return /* @__PURE__ */ u$1(
    "span",
    {
      class: "dm-icon" + (props.class ? " " + props.class : ""),
      "data-icon": props.name,
      "aria-hidden": "true",
      style: { "--ctdp-icon-url": 'url("' + url + '")' }
    }
  );
}
const VIEWPORT_MARGIN = 8;
function Popover(props) {
  const [open, setOpen] = d(false);
  const [position, setPosition] = d(null);
  const rootRef = T(null);
  const triggerRef = T(null);
  const panelRef = T(null);
  F(function() {
    if (!open) {
      setPosition(null);
      return;
    }
    const trigger = triggerRef.current;
    const panel = panelRef.current;
    if (!trigger || !panel) return;
    const triggerRect = trigger.getBoundingClientRect();
    const panelRect = panel.getBoundingClientRect();
    const spaceBelow = window.innerHeight - triggerRect.bottom;
    const top = spaceBelow < panelRect.height + VIEWPORT_MARGIN && triggerRect.top > panelRect.height + VIEWPORT_MARGIN ? triggerRect.top - panelRect.height - 6 : triggerRect.bottom + 6;
    const left = Math.max(VIEWPORT_MARGIN, Math.min(triggerRect.right - panelRect.width, window.innerWidth - panelRect.width - VIEWPORT_MARGIN));
    setPosition({ top, left });
  }, [open]);
  A(function() {
    if (!open) return;
    function handlePointerDown(event) {
      if (rootRef.current && !rootRef.current.contains(event.target)) setOpen(false);
    }
    function handleViewportChange(event) {
      if (panelRef.current && event.target instanceof Node && panelRef.current.contains(event.target)) return;
      setOpen(false);
    }
    document.addEventListener("pointerdown", handlePointerDown);
    window.addEventListener("resize", handleViewportChange);
    document.addEventListener("scroll", handleViewportChange, true);
    return function() {
      document.removeEventListener("pointerdown", handlePointerDown);
      window.removeEventListener("resize", handleViewportChange);
      document.removeEventListener("scroll", handleViewportChange, true);
    };
  }, [open]);
  function close() {
    setOpen(false);
    triggerRef.current?.focus();
  }
  return /* @__PURE__ */ u$1(
    "div",
    {
      ref: rootRef,
      class: "dm-popover-root",
      onClick: function(event) {
        event.stopPropagation();
      },
      onKeyDown: function(event) {
        if (event.key !== "Escape" || !open) return;
        event.stopPropagation();
        close();
      },
      children: [
        /* @__PURE__ */ u$1(
          "button",
          {
            ref: triggerRef,
            type: "button",
            class: props.triggerClass || "dm-ghost-btn",
            "aria-label": props.label,
            title: props.label,
            "aria-expanded": open,
            onClick: function() {
              setOpen(!open);
            },
            children: props.trigger
          }
        ),
        open ? /* @__PURE__ */ u$1(
          "div",
          {
            ref: panelRef,
            class: "dm-popover",
            style: position ? { top: position.top + "px", left: position.left + "px" } : { visibility: "hidden" },
            children: props.children(close)
          }
        ) : null
      ]
    }
  );
}
function ColumnPicker(props) {
  return /* @__PURE__ */ u$1(
    Popover,
    {
      label: "选择显示的列",
      trigger: /* @__PURE__ */ u$1(M, { children: [
        /* @__PURE__ */ u$1(Icon, { name: "columns-3" }),
        "列"
      ] }),
      children: function() {
        return /* @__PURE__ */ u$1("div", { class: "dm-column-picker", children: [
          /* @__PURE__ */ u$1("div", { class: "dm-popover-title", children: "显示的列" }),
          DISPLAY_FIELD_ORDER.map(function(fieldKey) {
            const checked = props.columns.includes(fieldKey);
            const locked = checked && props.columns.length === 1;
            return /* @__PURE__ */ u$1("label", { class: "dm-check-row" + (locked ? " is-locked" : ""), children: [
              /* @__PURE__ */ u$1(
                "input",
                {
                  type: "checkbox",
                  checked,
                  disabled: locked,
                  onChange: function() {
                    props.onChange(toggleColumn(props.columns, fieldKey));
                  }
                }
              ),
              getFieldLabel(fieldKey)
            ] }, fieldKey);
          }),
          /* @__PURE__ */ u$1("div", { class: "dm-popover-foot", children: /* @__PURE__ */ u$1(
            "button",
            {
              type: "button",
              class: "dm-link-btn",
              onClick: function() {
                props.onChange(props.defaultColumns.slice());
              },
              children: "恢复默认"
            }
          ) })
        ] });
      }
    }
  );
}
function Dialog(props) {
  const dialogRef = T(null);
  A(function() {
    const previousFocus = document.activeElement;
    const node = dialogRef.current;
    const focusTarget = node?.querySelector("[data-autofocus]") || node?.querySelector("input, button");
    focusTarget?.focus();
    return function() {
      if (previousFocus && document.contains(previousFocus)) previousFocus.focus();
    };
  }, []);
  return /* @__PURE__ */ u$1(
    "div",
    {
      class: "dm-dialog-layer",
      onKeyDown: function(event) {
        if (event.key !== "Escape") return;
        event.stopPropagation();
        props.onClose();
      },
      children: [
        /* @__PURE__ */ u$1("button", { type: "button", class: "dm-dialog-backdrop", tabIndex: -1, "aria-label": "关闭", onClick: props.onClose }),
        /* @__PURE__ */ u$1(
          "section",
          {
            ref: dialogRef,
            class: "dm-dialog" + (props.wide ? " is-wide" : ""),
            role: "dialog",
            "aria-modal": "true",
            "aria-label": props.title,
            children: [
              /* @__PURE__ */ u$1("header", { class: "dm-dialog-head", children: /* @__PURE__ */ u$1("div", { children: [
                /* @__PURE__ */ u$1("h2", { class: "dm-dialog-title", children: props.title }),
                props.description ? /* @__PURE__ */ u$1("p", { class: "dm-dialog-desc", children: props.description }) : null
              ] }) }),
              props.children ? /* @__PURE__ */ u$1("div", { class: "dm-dialog-body", children: props.children }) : null,
              props.footer ? /* @__PURE__ */ u$1("footer", { class: "dm-dialog-foot", children: props.footer }) : null
            ]
          }
        )
      ]
    }
  );
}
function CopyToSitesDialog(props) {
  const [sites, setSites] = d(null);
  const [selected, setSelected] = d([]);
  const [filter, setFilter] = d("");
  const [manualInput, setManualInput] = d("");
  const [manualError, setManualError] = d("");
  const [submitting, setSubmitting] = d(false);
  A(function() {
    void listScopeSummaries().then(function(summaries) {
      setSites(buildCopyTargets(summaries, props.systems, props.scope));
    }, function() {
      setSites(buildCopyTargets([], props.systems, props.scope));
    });
  }, [props.scope]);
  const keyword = filter.trim().toLowerCase();
  const visibleSites = (sites || []).filter(function(site) {
    return !keyword || site.scope.includes(keyword) || formatScopeLabel(site.scope, props.systems).toLowerCase().includes(keyword);
  });
  function toggle(scope) {
    setSelected(function(current) {
      return current.includes(scope) ? current.filter(function(item) {
        return item !== scope;
      }) : current.concat(scope);
    });
  }
  function addManualSite() {
    const parsed = parseScopeInput(manualInput, props.scope, props.systems);
    if (parsed.error) {
      setManualError(parsed.error);
      return;
    }
    setSites(function(current) {
      const list = current || [];
      return list.some(function(site) {
        return site.scope === parsed.scope;
      }) ? list : list.concat({ favorites: 0, history: 0, scope: parsed.scope });
    });
    setSelected(function(current) {
      return current.includes(parsed.scope) ? current : current.concat(parsed.scope);
    });
    setFilter("");
    setManualInput("");
    setManualError("");
  }
  async function submit() {
    if (!selected.length || submitting) return;
    setSubmitting(true);
    try {
      await props.onConfirm(selected);
    } finally {
      setSubmitting(false);
    }
  }
  return /* @__PURE__ */ u$1(
    Dialog,
    {
      title: "复制「" + props.title + "」到其他站点",
      description: "将写入目标站点的常用数据；目标站点已有相同数据时会跳过。",
      onClose: props.onClose,
      footer: /* @__PURE__ */ u$1(M, { children: [
        /* @__PURE__ */ u$1("button", { type: "button", class: "dm-secondary-btn", onClick: props.onClose, children: "取消" }),
        /* @__PURE__ */ u$1(
          "button",
          {
            type: "button",
            class: "dm-primary-btn",
            disabled: !selected.length || submitting,
            onClick: function() {
              void submit();
            },
            children: selected.length ? "复制到 " + selected.length + " 个站点" : "选择目标站点"
          }
        )
      ] }),
      children: /* @__PURE__ */ u$1("div", { class: "dm-site-picker", children: [
        /* @__PURE__ */ u$1("label", { class: "dm-search is-block", children: [
          /* @__PURE__ */ u$1(Icon, { name: "search", class: "dm-search-icon" }),
          /* @__PURE__ */ u$1(
            "input",
            {
              type: "search",
              class: "dm-search-input",
              value: filter,
              placeholder: "筛选站点",
              "aria-label": "筛选站点",
              onInput: function(event) {
                setFilter(event.currentTarget.value);
              }
            }
          )
        ] }),
        /* @__PURE__ */ u$1("div", { class: "dm-site-list", role: "group", "aria-label": "目标站点", children: [
          sites === null ? /* @__PURE__ */ u$1("p", { class: "dm-site-empty", children: "正在读取站点…" }) : null,
          sites !== null && !visibleSites.length ? /* @__PURE__ */ u$1("p", { class: "dm-site-empty", children: sites.length ? "没有匹配的站点" : "还没有其他站点的数据，可在下方手动添加。" }) : null,
          visibleSites.map(function(site) {
            const checked = selected.includes(site.scope);
            return /* @__PURE__ */ u$1("label", { class: "dm-site-option" + (checked ? " is-checked" : ""), children: [
              /* @__PURE__ */ u$1("input", { type: "checkbox", checked, onChange: function() {
                toggle(site.scope);
              } }),
              /* @__PURE__ */ u$1("span", { class: "dm-site-option-name", title: site.scope, children: formatScopeLabel(site.scope, props.systems) }),
              /* @__PURE__ */ u$1("span", { class: "dm-site-option-meta", children: [
                "常用 ",
                site.favorites,
                " · 记录 ",
                site.history
              ] })
            ] }, site.scope);
          })
        ] }),
        /* @__PURE__ */ u$1("div", { class: "dm-form-field", children: [
          /* @__PURE__ */ u$1("span", { class: "dm-form-label", children: "其他站点" }),
          /* @__PURE__ */ u$1("div", { class: "dm-inline-form", children: [
            /* @__PURE__ */ u$1(
              "input",
              {
                class: "dm-input" + (manualError ? " is-warning" : ""),
                type: "text",
                value: manualInput,
                placeholder: "输入域名或粘贴网址",
                "aria-label": "输入其他站点",
                "aria-describedby": manualError ? "dm-manual-site-error" : void 0,
                onInput: function(event) {
                  setManualInput(event.currentTarget.value);
                  setManualError("");
                },
                onKeyDown: function(event) {
                  if (event.key !== "Enter") return;
                  event.preventDefault();
                  addManualSite();
                }
              }
            ),
            /* @__PURE__ */ u$1("button", { type: "button", class: "dm-secondary-btn", onClick: addManualSite, children: [
              /* @__PURE__ */ u$1(Icon, { name: "plus" }),
              "添加"
            ] })
          ] }),
          manualError ? /* @__PURE__ */ u$1("span", { id: "dm-manual-site-error", class: "dm-field-warning", children: [
            /* @__PURE__ */ u$1(Icon, { name: "circle-alert" }),
            manualError
          ] }) : null
        ] })
      ] })
    }
  );
}
function DeleteSystemDialog(props) {
  const targets = getDeleteTargets(props.system);
  const [selected, setSelected] = d(targets[0]?.scope || "");
  const [submitting, setSubmitting] = d(false);
  async function submit() {
    if (!selected || submitting) return;
    setSubmitting(true);
    try {
      await props.onConfirm(selected);
    } finally {
      setSubmitting(false);
    }
  }
  return /* @__PURE__ */ u$1(
    Dialog,
    {
      title: "删除系统「" + (props.system.name || "未命名系统") + "」",
      description: "系统记录将被删除，它的常用数据、生成记录、字段标注和开关会退回到下面选中的站点，之后可继续使用或手动清理。",
      onClose: props.onClose,
      footer: /* @__PURE__ */ u$1(M, { children: [
        /* @__PURE__ */ u$1("button", { type: "button", class: "dm-secondary-btn", "data-autofocus": true, onClick: props.onClose, children: "取消" }),
        /* @__PURE__ */ u$1("button", { type: "button", class: "dm-danger-btn", disabled: !selected || submitting, onClick: function() {
          void submit();
        }, children: "删除系统" })
      ] }),
      children: /* @__PURE__ */ u$1("div", { class: "dm-radio-list", role: "radiogroup", "aria-label": "数据退回的站点", children: targets.map(function(target) {
        const checked = selected === target.scope;
        return /* @__PURE__ */ u$1("label", { class: "dm-site-option" + (checked ? " is-checked" : ""), children: [
          /* @__PURE__ */ u$1(
            "input",
            {
              type: "radio",
              name: "dm-delete-system-target",
              value: target.scope,
              checked,
              onChange: function() {
                setSelected(target.scope);
              }
            }
          ),
          /* @__PURE__ */ u$1("span", { class: "dm-site-option-name", title: target.scope, children: target.label }),
          /* @__PURE__ */ u$1("span", { class: "dm-site-option-meta", children: "退回此站点" })
        ] }, target.scope);
      }) })
    }
  );
}
function EmptyState(props) {
  return /* @__PURE__ */ u$1("section", { class: "dm-empty-state", children: [
    /* @__PURE__ */ u$1("span", { class: "dm-empty-icon", children: /* @__PURE__ */ u$1(Icon, { name: props.icon }) }),
    /* @__PURE__ */ u$1("h2", { children: props.title }),
    /* @__PURE__ */ u$1("p", { children: props.description }),
    props.children
  ] });
}
function checkWith(validator, message) {
  return function(value, api) {
    const validate = api[validator];
    if (typeof validate !== "function") return "";
    return validate(value) ? "" : message;
  };
}
function checkPattern(pattern, message) {
  return function(value) {
    return pattern.test(value) ? "" : message;
  };
}
const RULES = {
  bankCard: checkWith("validateBankCardNumber", "银行卡号应为 16–19 位数字且通过 Luhn 校验"),
  creditCode: checkWith("validateUnifiedSocialCreditCode", "统一社会信用代码格式或校验位不正确"),
  email: checkPattern(/^[^\s@]+@[^\s@]+\.[^\s@]+$/, "邮箱格式不正确"),
  idNumber: checkWith("validateChineseIdNumber", "身份证号格式、出生日期或校验位不正确"),
  landline: checkPattern(/^0\d{2,3}-?\d{7,8}$/, "固定电话应形如 021-68881234"),
  mobile: checkPattern(/^1[3-9]\d{9}$/, "手机号应为以 1 开头的 11 位数字"),
  postalCode: checkPattern(/^\d{6}$/, "邮政编码应为 6 位数字")
};
function getFieldWarning(fieldKey, value, api) {
  const trimmed = String(value || "").trim();
  if (!trimmed) return "";
  const rule = RULES[fieldKey];
  return rule ? rule(trimmed, api) : "";
}
function getGeneratorsApi() {
  return typeof window !== "undefined" && window.ChromeTestDataGenerators || {};
}
function generateFieldValue(fieldKey, api = getGeneratorsApi()) {
  return typeof api.generateFieldValue === "function" ? String(api.generateFieldValue(fieldKey) || "") : "";
}
function generateRandomProfile(api = getGeneratorsApi()) {
  return normalizeProfile(Object.fromEntries(FIELD_KEYS.map(function(fieldKey) {
    return [fieldKey, generateFieldValue(fieldKey, api)];
  })));
}
function IconButton(props) {
  return /* @__PURE__ */ u$1(
    "button",
    {
      type: "button",
      class: "dm-icon-btn" + (props.tone ? " is-" + props.tone : ""),
      "aria-label": props.label,
      title: props.label,
      disabled: props.disabled,
      onClick: function(event) {
        event.stopPropagation();
        props.onClick();
      },
      children: /* @__PURE__ */ u$1(Icon, { name: props.icon })
    }
  );
}
function DrawerShell(props) {
  return /* @__PURE__ */ u$1("aside", { class: "dm-drawer", "aria-label": props.eyebrow + "详情", children: [
    /* @__PURE__ */ u$1("header", { class: "dm-drawer-head", children: [
      /* @__PURE__ */ u$1("div", { class: "dm-drawer-heading", children: [
        /* @__PURE__ */ u$1("span", { class: "dm-drawer-eyebrow", children: [
          props.eyebrow,
          props.badge ? /* @__PURE__ */ u$1("span", { class: "dm-badge", children: props.badge }) : null
        ] }),
        /* @__PURE__ */ u$1("h2", { class: "dm-drawer-title", title: props.title, children: props.title }),
        props.subtitle ? /* @__PURE__ */ u$1("p", { class: "dm-drawer-subtitle", children: props.subtitle }) : null
      ] }),
      /* @__PURE__ */ u$1(IconButton, { icon: "x", label: "关闭详情", onClick: props.onClose })
    ] }),
    /* @__PURE__ */ u$1("div", { class: "dm-drawer-body", children: props.children }),
    props.footer ? /* @__PURE__ */ u$1("footer", { class: "dm-drawer-foot", children: props.footer }) : null
  ] });
}
function ProfileDetails(props) {
  return /* @__PURE__ */ u$1(M, { children: FIELD_GROUPS.map(function(group) {
    return /* @__PURE__ */ u$1("section", { class: "dm-detail-group", children: [
      /* @__PURE__ */ u$1("h3", { class: "dm-detail-group-title", children: group.title }),
      /* @__PURE__ */ u$1("dl", { class: "dm-detail-list", children: group.fields.map(function(fieldKey) {
        const value = props.profile[fieldKey];
        return /* @__PURE__ */ u$1("div", { class: "dm-detail-row", children: [
          /* @__PURE__ */ u$1("dt", { children: getFieldLabel(fieldKey) }),
          /* @__PURE__ */ u$1("dd", { children: value ? /* @__PURE__ */ u$1(
            "button",
            {
              type: "button",
              class: "dm-detail-value" + (isMonospaceField(fieldKey) ? " is-mono" : ""),
              title: "点击复制",
              onClick: function() {
                props.onCopyField(fieldKey, value);
              },
              children: [
                /* @__PURE__ */ u$1("span", { children: value }),
                /* @__PURE__ */ u$1(Icon, { name: "copy", class: "dm-copy-cell-icon" })
              ]
            }
          ) : /* @__PURE__ */ u$1("span", { class: "dm-cell-empty", children: "—" }) })
        ] }, fieldKey);
      }) })
    ] }, group.title);
  }) });
}
const NOTE_MAX_LENGTH = 120;
const NAME_MAX_LENGTH$1 = 40;
function createInitialDraft(entry) {
  return {
    name: entry ? getCustomFavoriteName(entry.name) : "",
    note: entry ? entry.note : "",
    profile: normalizeProfile(entry ? entry.profile : void 0)
  };
}
function isSameDraft(left, right) {
  return left.name.trim() === right.name.trim() && left.note.trim() === right.note.trim() && isSameProfile(normalizeProfile(left.profile), normalizeProfile(right.profile));
}
function FavoriteEditor(props) {
  const initialDraft = b(function() {
    return createInitialDraft(props.entry);
  }, [props.entry ? props.entry.id : ""]);
  const [draft, setDraft] = d(initialDraft);
  const [duplicate, setDuplicate] = d(null);
  const [saving, setSaving] = d(false);
  const formRef = T(null);
  const bannerRef = T(null);
  const generatorsApi = getGeneratorsApi();
  const canGenerate = typeof generatorsApi.generateFieldValue === "function";
  const dirty = !isSameDraft(draft, initialDraft);
  const hasValue = FIELD_KEYS.some(function(fieldKey) {
    return draft.profile[fieldKey].trim() !== "";
  });
  const formId = "dm-favorite-editor";
  F(function() {
    props.onDirtyChange(dirty);
  }, [dirty]);
  A(function() {
    return function() {
      props.onDirtyChange(false);
    };
  }, []);
  A(function() {
    formRef.current?.querySelector("input")?.focus();
  }, []);
  A(function() {
    if (duplicate) bannerRef.current?.scrollIntoView({ block: "nearest", behavior: "smooth" });
  }, [duplicate]);
  A(function() {
    function handleKeydown(event) {
      if (event.key.toLowerCase() !== "s" || !(event.metaKey || event.ctrlKey)) return;
      event.preventDefault();
      formRef.current?.requestSubmit();
    }
    document.addEventListener("keydown", handleKeydown);
    return function() {
      document.removeEventListener("keydown", handleKeydown);
    };
  }, []);
  function updateDraft(patch) {
    setDuplicate(null);
    setDraft(function(current) {
      return { ...current, ...patch };
    });
  }
  function updateField(fieldKey, value) {
    setDuplicate(null);
    setDraft(function(current) {
      return { ...current, profile: { ...current.profile, [fieldKey]: value } };
    });
  }
  async function handleSubmit(event) {
    event.preventDefault();
    if (!hasValue || saving) return;
    const profile = normalizeProfile(Object.fromEntries(FIELD_KEYS.map(function(fieldKey) {
      return [fieldKey, draft.profile[fieldKey].trim()];
    })));
    const existing = props.favorites.find(function(entry) {
      return (!props.entry || entry.id !== props.entry.id) && isSameProfile(entry.profile, profile);
    });
    if (existing) {
      setDuplicate(existing);
      return;
    }
    setSaving(true);
    try {
      await props.onSave({ name: draft.name.trim() || DEFAULT_FAVORITE_NAME, note: draft.note.trim(), profile });
    } finally {
      setSaving(false);
    }
  }
  return /* @__PURE__ */ u$1(
    DrawerShell,
    {
      eyebrow: props.entry ? "编辑常用数据" : "新增常用数据",
      title: props.entry ? getFavoriteTitle(props.entry) : "新的常用数据",
      subtitle: props.entry ? "" : "仅保存到当前站点，格式问题只做提示，不影响保存。",
      onClose: props.onCancel,
      footer: /* @__PURE__ */ u$1(M, { children: [
        /* @__PURE__ */ u$1("span", { class: "dm-drawer-foot-hint", children: hasValue ? "⌘/Ctrl + S 保存" : "至少填写一个字段" }),
        /* @__PURE__ */ u$1("span", { class: "dm-drawer-foot-spacer" }),
        /* @__PURE__ */ u$1("button", { type: "button", class: "dm-secondary-btn", onClick: props.onCancel, children: "取消" }),
        /* @__PURE__ */ u$1("button", { type: "submit", form: formId, class: "dm-primary-btn", disabled: !hasValue || saving, children: "保存" })
      ] }),
      children: /* @__PURE__ */ u$1(
        "form",
        {
          id: formId,
          ref: formRef,
          class: "dm-editor",
          onSubmit: function(event) {
            void handleSubmit(event);
          },
          children: [
            props.entry && props.liveEntry === null ? /* @__PURE__ */ u$1("div", { class: "dm-banner is-warning", role: "status", children: [
              /* @__PURE__ */ u$1(Icon, { name: "circle-alert" }),
              /* @__PURE__ */ u$1("span", { class: "dm-banner-text", children: "这组数据已在其他页面被删除，保存后将重新创建。" })
            ] }) : null,
            props.entry && props.liveEntry && props.liveEntry.updatedAt !== props.entry.updatedAt ? /* @__PURE__ */ u$1("div", { class: "dm-banner is-info", role: "status", children: [
              /* @__PURE__ */ u$1(Icon, { name: "circle-alert" }),
              /* @__PURE__ */ u$1("span", { class: "dm-banner-text", children: "这组数据已在其他页面更新，保存将覆盖那次修改。" }),
              props.onLoadLatest ? /* @__PURE__ */ u$1("button", { type: "button", class: "dm-link-btn", onClick: props.onLoadLatest, children: "载入最新" }) : null
            ] }) : null,
            duplicate ? /* @__PURE__ */ u$1("div", { ref: bannerRef, class: "dm-banner is-warning", role: "alert", children: [
              /* @__PURE__ */ u$1(Icon, { name: "circle-alert" }),
              /* @__PURE__ */ u$1("span", { class: "dm-banner-text", children: [
                "已存在相同数据「",
                getFavoriteTitle(duplicate),
                "」，未重复保存。"
              ] }),
              /* @__PURE__ */ u$1("button", { type: "button", class: "dm-link-btn", onClick: function() {
                props.onShowExisting(duplicate.id);
              }, children: "查看" })
            ] }) : null,
            /* @__PURE__ */ u$1("section", { class: "dm-detail-group", children: [
              /* @__PURE__ */ u$1("h3", { class: "dm-detail-group-title", children: "基本信息" }),
              /* @__PURE__ */ u$1("label", { class: "dm-form-field", children: [
                /* @__PURE__ */ u$1("span", { class: "dm-form-label", children: "名称" }),
                /* @__PURE__ */ u$1(
                  "input",
                  {
                    class: "dm-input",
                    type: "text",
                    maxLength: NAME_MAX_LENGTH$1,
                    value: draft.name,
                    placeholder: "如：主账号；留空则显示姓名",
                    onInput: function(event) {
                      updateDraft({ name: event.currentTarget.value });
                    }
                  }
                )
              ] }),
              /* @__PURE__ */ u$1("label", { class: "dm-form-field", children: [
                /* @__PURE__ */ u$1("span", { class: "dm-form-label", children: "备注" }),
                /* @__PURE__ */ u$1(
                  "textarea",
                  {
                    class: "dm-input dm-textarea",
                    rows: 2,
                    maxLength: NOTE_MAX_LENGTH,
                    value: draft.note,
                    placeholder: "记录这组数据的用途",
                    onInput: function(event) {
                      updateDraft({ note: event.currentTarget.value });
                    }
                  }
                )
              ] })
            ] }),
            /* @__PURE__ */ u$1("div", { class: "dm-editor-tools", children: [
              /* @__PURE__ */ u$1("span", { class: "dm-detail-group-title", children: "字段" }),
              canGenerate ? /* @__PURE__ */ u$1(
                "button",
                {
                  type: "button",
                  class: "dm-ghost-btn is-small",
                  onClick: function() {
                    updateDraft({ profile: generateRandomProfile(generatorsApi) });
                  },
                  children: [
                    /* @__PURE__ */ u$1(Icon, { name: "dices" }),
                    "整组随机生成"
                  ]
                }
              ) : null
            ] }),
            FIELD_GROUPS.map(function(group) {
              return /* @__PURE__ */ u$1("section", { class: "dm-detail-group is-compact", children: [
                /* @__PURE__ */ u$1("h3", { class: "dm-detail-group-title", children: group.title }),
                group.fields.map(function(fieldKey) {
                  const value = draft.profile[fieldKey];
                  const warning = getFieldWarning(fieldKey, value, generatorsApi);
                  const warningId = "dm-warning-" + fieldKey;
                  return /* @__PURE__ */ u$1("div", { class: "dm-form-field", children: [
                    /* @__PURE__ */ u$1("label", { class: "dm-form-label", for: "dm-field-" + fieldKey, children: getFieldLabel(fieldKey) }),
                    /* @__PURE__ */ u$1("div", { class: "dm-input-group", children: [
                      /* @__PURE__ */ u$1(
                        "input",
                        {
                          id: "dm-field-" + fieldKey,
                          class: "dm-input" + (warning ? " is-warning" : ""),
                          type: "text",
                          value,
                          placeholder: "填写" + getFieldLabel(fieldKey),
                          "aria-describedby": warning ? warningId : void 0,
                          onInput: function(event) {
                            updateField(fieldKey, event.currentTarget.value);
                          }
                        }
                      ),
                      canGenerate ? /* @__PURE__ */ u$1(
                        "button",
                        {
                          type: "button",
                          class: "dm-input-addon",
                          "aria-label": "随机生成" + getFieldLabel(fieldKey),
                          title: "随机生成" + getFieldLabel(fieldKey),
                          onClick: function() {
                            updateField(fieldKey, generateFieldValue(fieldKey, generatorsApi));
                          },
                          children: /* @__PURE__ */ u$1(Icon, { name: "dices" })
                        }
                      ) : null
                    ] }),
                    warning ? /* @__PURE__ */ u$1("span", { id: warningId, class: "dm-field-warning", children: [
                      /* @__PURE__ */ u$1(Icon, { name: "circle-alert" }),
                      warning
                    ] }) : null
                  ] }, fieldKey);
                })
              ] }, group.title);
            })
          ]
        }
      )
    }
  );
}
function Highlight(props) {
  return /* @__PURE__ */ u$1(M, { children: splitHighlight(props.text, props.query).map(function(segment, index) {
    return segment.match ? /* @__PURE__ */ u$1("mark", { class: "dm-mark", children: segment.text }, index) : segment.text;
  }) });
}
function FieldCell(props) {
  if (!props.value) return /* @__PURE__ */ u$1("span", { class: "dm-cell-empty", children: "—" });
  return /* @__PURE__ */ u$1(
    "button",
    {
      type: "button",
      class: "dm-copy-cell" + (isMonospaceField(props.fieldKey) ? " is-mono" : ""),
      title: props.value + "（点击复制）",
      onClick: function(event) {
        event.stopPropagation();
        props.onCopy(props.fieldKey, props.value);
      },
      children: [
        /* @__PURE__ */ u$1("span", { class: "dm-copy-cell-text", children: /* @__PURE__ */ u$1(Highlight, { text: props.value, query: props.query }) }),
        /* @__PURE__ */ u$1(Icon, { name: "copy", class: "dm-copy-cell-icon" })
      ]
    }
  );
}
function MoreMenu(props) {
  return /* @__PURE__ */ u$1(Popover, { label: props.label, triggerClass: "dm-icon-btn", trigger: /* @__PURE__ */ u$1(Icon, { name: "ellipsis" }), children: function(close) {
    return /* @__PURE__ */ u$1("div", { class: "dm-menu", role: "menu", children: props.items.map(function(item) {
      return /* @__PURE__ */ u$1(
        "button",
        {
          type: "button",
          role: "menuitem",
          class: "dm-menu-item" + (item.danger ? " is-danger" : ""),
          onClick: function() {
            close();
            item.onSelect();
          },
          children: [
            /* @__PURE__ */ u$1(Icon, { name: item.icon }),
            item.label
          ]
        },
        item.label
      );
    }) });
  } });
}
function FavoritesTable(props) {
  const [dragOrder, setDragOrder] = d(null);
  const draggedIdRef = T(null);
  const pendingFocusIdRef = T(null);
  const tableRef = T(null);
  const entriesById = new Map(props.entries.map(function(entry) {
    return [entry.id, entry];
  }));
  const orderedEntries = (dragOrder || props.entries.map(function(entry) {
    return entry.id;
  })).map(function(id) {
    return entriesById.get(id);
  }).filter(function(entry) {
    return !!entry;
  });
  A(function() {
    const focusId = pendingFocusIdRef.current;
    if (!focusId) return;
    pendingFocusIdRef.current = null;
    tableRef.current?.querySelector('.dm-drag-handle[data-id="' + CSS.escape(focusId) + '"]')?.focus();
  }, [props.entries]);
  function finishDrag(commit) {
    const order = dragOrder;
    draggedIdRef.current = null;
    setDragOrder(null);
    if (commit && order) props.onReorder(order);
  }
  return /* @__PURE__ */ u$1("div", { class: "dm-table-shell", children: /* @__PURE__ */ u$1("table", { ref: tableRef, class: "dm-table dm-favorites-table", children: [
    /* @__PURE__ */ u$1("thead", { children: /* @__PURE__ */ u$1("tr", { children: [
      /* @__PURE__ */ u$1("th", { class: "dm-col-handle", "aria-label": "排序" }),
      /* @__PURE__ */ u$1("th", { children: "名称" }),
      props.columns.map(function(fieldKey) {
        return /* @__PURE__ */ u$1("th", { children: getFieldLabel(fieldKey) }, fieldKey);
      }),
      /* @__PURE__ */ u$1("th", { class: "dm-col-actions", children: "操作" })
    ] }) }),
    /* @__PURE__ */ u$1(
      "tbody",
      {
        onDragOver: function(event) {
          const draggedId = draggedIdRef.current;
          if (!draggedId) return;
          event.preventDefault();
          const row = event.target?.closest("tr[data-favorite-id]");
          const targetId = row?.getAttribute("data-favorite-id");
          if (!row || !targetId || targetId === draggedId) return;
          const rect = row.getBoundingClientRect();
          const placeBefore = event.clientY < rect.top + rect.height / 2;
          setDragOrder(function(current) {
            return moveId(current || orderedEntries.map(function(entry) {
              return entry.id;
            }), draggedId, targetId, placeBefore);
          });
        },
        onDrop: function(event) {
          if (!draggedIdRef.current) return;
          event.preventDefault();
          finishDrag(true);
        },
        children: orderedEntries.map(function(entry) {
          const customName = getCustomFavoriteName(entry.name);
          return /* @__PURE__ */ u$1(
            "tr",
            {
              "data-favorite-id": entry.id,
              tabIndex: 0,
              class: [
                "dm-row",
                props.selectedId === entry.id ? "is-selected" : "",
                dragOrder && draggedIdRef.current === entry.id ? "is-dragging" : ""
              ].join(" ").trim(),
              onClick: function() {
                props.onSelect(entry.id);
              },
              onKeyDown: function(event) {
                if (event.key === "Enter" && event.target === event.currentTarget) props.onSelect(entry.id);
              },
              children: [
                /* @__PURE__ */ u$1("td", { class: "dm-col-handle", children: /* @__PURE__ */ u$1(
                  "button",
                  {
                    type: "button",
                    class: "dm-drag-handle",
                    draggable: props.sortable,
                    disabled: !props.sortable,
                    "data-id": entry.id,
                    "aria-label": "拖动排序",
                    title: props.sortable ? "拖动排序（也可使用上下方向键）" : "搜索时不可排序",
                    onClick: function(event) {
                      event.stopPropagation();
                    },
                    onDragStart: function(event) {
                      draggedIdRef.current = entry.id;
                      setDragOrder(props.entries.map(function(item) {
                        return item.id;
                      }));
                      if (event.dataTransfer) {
                        event.dataTransfer.effectAllowed = "move";
                        event.dataTransfer.setData("text/plain", entry.id);
                      }
                    },
                    onDragEnd: function() {
                      if (draggedIdRef.current) finishDrag(false);
                    },
                    onKeyDown: function(event) {
                      if (event.key !== "ArrowUp" && event.key !== "ArrowDown") return;
                      const ids = props.entries.map(function(item) {
                        return item.id;
                      });
                      const next = shiftId(ids, entry.id, event.key === "ArrowUp" ? -1 : 1);
                      if (!next) return;
                      event.preventDefault();
                      pendingFocusIdRef.current = entry.id;
                      props.onReorder(next);
                    },
                    children: /* @__PURE__ */ u$1(Icon, { name: "grip-vertical" })
                  }
                ) }),
                /* @__PURE__ */ u$1("td", { children: /* @__PURE__ */ u$1("div", { class: "dm-title-cell", children: [
                  /* @__PURE__ */ u$1("span", { class: "dm-title-text" + (customName ? "" : " is-fallback"), children: /* @__PURE__ */ u$1(Highlight, { text: getFavoriteTitle(entry), query: props.query }) }),
                  entry.note ? /* @__PURE__ */ u$1("span", { class: "dm-title-note", title: entry.note, children: /* @__PURE__ */ u$1(Highlight, { text: entry.note, query: props.query }) }) : null
                ] }) }),
                props.columns.map(function(fieldKey) {
                  return /* @__PURE__ */ u$1("td", { children: /* @__PURE__ */ u$1(FieldCell, { fieldKey, value: entry.profile[fieldKey], query: props.query, onCopy: props.onCopyField }) }, fieldKey);
                }),
                /* @__PURE__ */ u$1("td", { class: "dm-col-actions", children: /* @__PURE__ */ u$1("div", { class: "dm-row-actions", children: [
                  /* @__PURE__ */ u$1(IconButton, { icon: "copy", label: "复制整组", onClick: function() {
                    props.onCopyAll(entry.id);
                  } }),
                  /* @__PURE__ */ u$1(IconButton, { icon: "pencil", label: "编辑", onClick: function() {
                    props.onEdit(entry.id);
                  } }),
                  /* @__PURE__ */ u$1(
                    MoreMenu,
                    {
                      label: "更多操作",
                      items: [
                        { icon: "copy-plus", label: "复制到其他站点", onSelect: function() {
                          props.onCopyToSites(entry.id);
                        } },
                        { icon: "trash-2", label: "删除", danger: true, onSelect: function() {
                          props.onDelete(entry.id);
                        } }
                      ]
                    }
                  )
                ] }) })
              ]
            },
            entry.id
          );
        })
      }
    )
  ] }) });
}
function getLogoUrl() {
  const iconAssets = window.ChromeTestDataIconAssets;
  return iconAssets?.getIconAssetUrl ? iconAssets.getIconAssetUrl("app-logo") : "";
}
function Header(props) {
  const scopeLabel = props.scope ? formatScopeLabel(props.scope, props.systems) : "";
  return /* @__PURE__ */ u$1("header", { class: "dm-header", children: [
    /* @__PURE__ */ u$1("div", { class: "dm-header-brand", children: [
      /* @__PURE__ */ u$1("img", { class: "dm-header-logo", src: getLogoUrl(), alt: "" }),
      /* @__PURE__ */ u$1("h1", { class: "dm-header-title", children: "数据管理" }),
      props.scope ? /* @__PURE__ */ u$1(M, { children: [
        /* @__PURE__ */ u$1("span", { class: "dm-header-divider", "aria-hidden": "true" }),
        /* @__PURE__ */ u$1("span", { class: "dm-site-chip", title: "当前站点：" + scopeLabel, children: [
          /* @__PURE__ */ u$1(Icon, { name: "globe" }),
          /* @__PURE__ */ u$1("span", { class: "dm-site-chip-text", children: scopeLabel })
        ] })
      ] }) : null
    ] }),
    /* @__PURE__ */ u$1("div", { class: "dm-header-actions", children: props.children })
  ] });
}
function HistoryTable(props) {
  return /* @__PURE__ */ u$1("div", { class: "dm-table-shell", children: /* @__PURE__ */ u$1("table", { class: "dm-table dm-history-table", children: [
    /* @__PURE__ */ u$1("thead", { children: /* @__PURE__ */ u$1("tr", { children: [
      /* @__PURE__ */ u$1("th", { children: "生成时间" }),
      props.columns.map(function(fieldKey) {
        return /* @__PURE__ */ u$1("th", { children: getFieldLabel(fieldKey) }, fieldKey);
      }),
      /* @__PURE__ */ u$1("th", { class: "dm-col-actions", children: "操作" })
    ] }) }),
    /* @__PURE__ */ u$1("tbody", { children: props.entries.map(function(entry) {
      return /* @__PURE__ */ u$1(
        "tr",
        {
          tabIndex: 0,
          class: "dm-row" + (props.selectedId === entry.id ? " is-selected" : "") + (props.freshIds.has(entry.id) ? " is-fresh" : ""),
          onClick: function() {
            props.onSelect(entry.id);
          },
          onKeyDown: function(event) {
            if (event.key === "Enter" && event.target === event.currentTarget) props.onSelect(entry.id);
          },
          children: [
            /* @__PURE__ */ u$1("td", { class: "dm-cell-time", children: [
              formatDisplayTime(entry.createdAt),
              props.favoritedIds.has(entry.id) ? /* @__PURE__ */ u$1("span", { class: "dm-badge", children: "已收藏" }) : null
            ] }),
            props.columns.map(function(fieldKey) {
              return /* @__PURE__ */ u$1("td", { children: /* @__PURE__ */ u$1(FieldCell, { fieldKey, value: entry.profile[fieldKey], query: props.query, onCopy: props.onCopyField }) }, fieldKey);
            }),
            /* @__PURE__ */ u$1("td", { class: "dm-col-actions", children: /* @__PURE__ */ u$1("div", { class: "dm-row-actions", children: [
              props.favoritedIds.has(entry.id) ? /* @__PURE__ */ u$1(IconButton, { icon: "star", label: "已收藏，查看常用数据", tone: "accent", onClick: function() {
                props.onFavorite(entry.id);
              } }) : /* @__PURE__ */ u$1(IconButton, { icon: "star", label: "收藏", onClick: function() {
                props.onFavorite(entry.id);
              } }),
              /* @__PURE__ */ u$1(IconButton, { icon: "copy", label: "复制整组", onClick: function() {
                props.onCopy(entry.id);
              } })
            ] }) })
          ]
        },
        entry.id
      );
    }) })
  ] }) });
}
const PREVIEW_LIMIT = 5;
function ImportDialog(props) {
  const [submitting, setSubmitting] = d(false);
  const count = props.toCreate.length;
  const description = count ? "将导入 " + count + " 条常用数据" + (props.duplicates ? "，" + props.duplicates + " 条与已有数据重复将跳过" : "") + "。" : "文件中的 " + props.duplicates + " 条数据都已存在，没有需要导入的新数据。";
  async function submit() {
    if (!count || submitting) return;
    setSubmitting(true);
    try {
      await props.onConfirm();
    } finally {
      setSubmitting(false);
    }
  }
  return /* @__PURE__ */ u$1(
    Dialog,
    {
      title: "导入常用数据",
      description,
      onClose: props.onClose,
      footer: count ? /* @__PURE__ */ u$1(M, { children: [
        /* @__PURE__ */ u$1("button", { type: "button", class: "dm-secondary-btn", onClick: props.onClose, children: "取消" }),
        /* @__PURE__ */ u$1("button", { type: "button", class: "dm-primary-btn", disabled: submitting, onClick: function() {
          void submit();
        }, children: [
          "导入 ",
          count,
          " 条"
        ] })
      ] }) : /* @__PURE__ */ u$1("button", { type: "button", class: "dm-primary-btn", onClick: props.onClose, children: "知道了" }),
      children: /* @__PURE__ */ u$1("div", { class: "dm-import-summary", children: [
        /* @__PURE__ */ u$1("div", { class: "dm-import-meta", children: [
          /* @__PURE__ */ u$1("span", { children: "文件" }),
          /* @__PURE__ */ u$1("span", { class: "dm-import-meta-value", title: props.fileName, children: props.fileName })
        ] }),
        props.sourceScope && props.sourceScope !== props.scope ? /* @__PURE__ */ u$1("p", { class: "dm-banner is-info", children: [
          "文件导出自 ",
          formatScopeLabel(props.sourceScope, props.systems),
          "，将导入到当前站点 ",
          formatScopeLabel(props.scope, props.systems),
          "。"
        ] }) : null,
        count ? /* @__PURE__ */ u$1("ul", { class: "dm-import-preview", children: [
          props.toCreate.slice(0, PREVIEW_LIMIT).map(function(item, index) {
            return /* @__PURE__ */ u$1("li", { children: [
              /* @__PURE__ */ u$1("span", { class: "dm-import-preview-title", children: getFavoriteTitle(item) }),
              /* @__PURE__ */ u$1("span", { class: "dm-import-preview-meta", children: item.profile.mobile || item.profile.idNumber || item.profile.companyName })
            ] }, index);
          }),
          count > PREVIEW_LIMIT ? /* @__PURE__ */ u$1("li", { class: "dm-import-preview-more", children: [
            "以及另外 ",
            count - PREVIEW_LIMIT,
            " 条"
          ] }) : null
        ] }) : null
      ] })
    }
  );
}
function SearchBox(props) {
  return /* @__PURE__ */ u$1("label", { class: "dm-search", children: [
    /* @__PURE__ */ u$1(Icon, { name: "search", class: "dm-search-icon" }),
    /* @__PURE__ */ u$1(
      "input",
      {
        ref: props.inputRef,
        type: "search",
        class: "dm-search-input",
        value: props.value,
        placeholder: props.placeholder || "搜索姓名、手机号、身份证…",
        "aria-label": props.label || "搜索数据",
        onInput: function(event) {
          props.onChange(event.currentTarget.value);
        },
        onKeyDown: function(event) {
          if (event.key === "Escape" && props.value) {
            event.stopPropagation();
            props.onChange("");
          }
        }
      }
    ),
    props.value ? /* @__PURE__ */ u$1(
      "button",
      {
        type: "button",
        class: "dm-search-clear",
        "aria-label": "清空搜索",
        onClick: function() {
          props.onChange("");
        },
        children: /* @__PURE__ */ u$1(Icon, { name: "x" })
      }
    ) : /* @__PURE__ */ u$1("kbd", { class: "dm-kbd", "aria-hidden": "true", children: "/" })
  ] });
}
function SystemDetails(props) {
  const { system, stats } = props;
  function titleSystemName(id) {
    const found = props.systems.find(function(item) {
      return item.id === id;
    });
    return found ? found.name || "未命名系统" : DELETED_SYSTEM_LABEL;
  }
  return /* @__PURE__ */ u$1(M, { children: [
    system.anomalies.length ? /* @__PURE__ */ u$1("section", { class: "dm-detail-group", children: [
      /* @__PURE__ */ u$1("h3", { class: "dm-detail-group-title", children: "异常提醒" }),
      /* @__PURE__ */ u$1("div", { class: "dm-banner is-warning dm-anomaly-banner", role: "alert", children: [
        /* @__PURE__ */ u$1(Icon, { name: "circle-alert" }),
        /* @__PURE__ */ u$1("span", { class: "dm-banner-text", children: "以下页面所在的域名属于本系统，但页面标题命中了其他系统，可能需要调整归属。" }),
        /* @__PURE__ */ u$1("button", { type: "button", class: "dm-link-btn", onClick: function() {
          props.onDismissAnomalies(system.id);
        }, children: "忽略" })
      ] }),
      /* @__PURE__ */ u$1("ul", { class: "dm-anomaly-list", children: system.anomalies.map(function(anomaly) {
        return /* @__PURE__ */ u$1("li", { class: "dm-anomaly-item", children: [
          /* @__PURE__ */ u$1("span", { class: "dm-anomaly-title", children: [
            "标题命中「",
            titleSystemName(anomaly.titleSystemId),
            "」"
          ] }),
          /* @__PURE__ */ u$1("span", { class: "dm-anomaly-url", title: anomaly.url, children: anomaly.url }),
          /* @__PURE__ */ u$1("span", { class: "dm-anomaly-time", children: formatDisplayTime(String(anomaly.at)) })
        ] }, anomaly.titleSystemId + anomaly.url);
      }) })
    ] }) : null,
    /* @__PURE__ */ u$1("section", { class: "dm-detail-group", children: [
      /* @__PURE__ */ u$1("h3", { class: "dm-detail-group-title", children: "基本信息" }),
      /* @__PURE__ */ u$1("dl", { class: "dm-detail-list", children: [
        /* @__PURE__ */ u$1("div", { class: "dm-detail-row", children: [
          /* @__PURE__ */ u$1("dt", { children: "系统 ID" }),
          /* @__PURE__ */ u$1("dd", { children: /* @__PURE__ */ u$1(
            "button",
            {
              type: "button",
              class: "dm-detail-value is-mono",
              title: "点击复制",
              onClick: function() {
                props.onCopyId(system.id);
              },
              children: [
                /* @__PURE__ */ u$1("span", { children: system.id }),
                /* @__PURE__ */ u$1(Icon, { name: "copy", class: "dm-copy-cell-icon" })
              ]
            }
          ) })
        ] }),
        /* @__PURE__ */ u$1("div", { class: "dm-detail-row", children: [
          /* @__PURE__ */ u$1("dt", { children: "标题关键词" }),
          /* @__PURE__ */ u$1("dd", { children: system.titles.length ? /* @__PURE__ */ u$1("span", { class: "dm-chip-list", children: system.titles.map(function(title) {
            return /* @__PURE__ */ u$1("span", { class: "dm-chip", children: title }, title);
          }) }) : /* @__PURE__ */ u$1("span", { class: "dm-cell-empty", children: "— 仅按端口、参数识别" }) })
        ] }),
        /* @__PURE__ */ u$1("div", { class: "dm-detail-row", children: [
          /* @__PURE__ */ u$1("dt", { children: "关联数据" }),
          /* @__PURE__ */ u$1("dd", { children: [
            "常用 ",
            stats.favorites,
            " · 记录 ",
            stats.history,
            " · 标注 ",
            stats.annotations
          ] })
        ] }),
        /* @__PURE__ */ u$1("div", { class: "dm-detail-row", children: [
          /* @__PURE__ */ u$1("dt", { children: "最近更新" }),
          /* @__PURE__ */ u$1("dd", { children: formatDisplayTime(String(system.updatedAt)) })
        ] })
      ] })
    ] }),
    /* @__PURE__ */ u$1("section", { class: "dm-detail-group", children: [
      /* @__PURE__ */ u$1("h3", { class: "dm-detail-group-title", children: [
        "环境（",
        system.environments.length,
        "）"
      ] }),
      system.environments.length ? /* @__PURE__ */ u$1("ul", { class: "dm-env-list", children: system.environments.map(function(environment) {
        const params = Object.keys(environment.query);
        return /* @__PURE__ */ u$1("li", { class: "dm-env-item", children: [
          /* @__PURE__ */ u$1("span", { class: "dm-env-host", children: [
            formatEnvironmentHost(environment),
            environment.autoAdded ? /* @__PURE__ */ u$1("span", { class: "dm-badge", children: "自动" }) : null
          ] }),
          environment.lastPath || params.length ? /* @__PURE__ */ u$1("span", { class: "dm-chip-list", children: [
            environment.lastPath ? /* @__PURE__ */ u$1("span", { class: "dm-chip", children: [
              "path = ",
              environment.lastPath
            ] }) : null,
            params.map(function(key) {
              return /* @__PURE__ */ u$1("span", { class: "dm-chip", children: [
                key,
                "=",
                environment.query[key]
              ] }, key);
            })
          ] }) : null
        ] }, environment.id || formatEnvironmentHost(environment));
      }) }) : /* @__PURE__ */ u$1("span", { class: "dm-cell-empty", children: "—" })
    ] })
  ] });
}
const NAME_MAX_LENGTH = 40;
function SystemEditor(props) {
  const initialDraft = b(function() {
    return createSystemDraft(props.entry);
  }, [props.entry ? props.entry.id + ":" + props.entry.updatedAt : ""]);
  const [draft, setDraft] = d(initialDraft);
  const [saving, setSaving] = d(false);
  const formRef = T(null);
  const dirty = !isSameSystemDraft(draft, initialDraft);
  const problem = validateSystemDraft(draft);
  const formId = "dm-system-editor";
  F(function() {
    props.onDirtyChange(dirty);
  }, [dirty]);
  A(function() {
    return function() {
      props.onDirtyChange(false);
    };
  }, []);
  A(function() {
    formRef.current?.querySelector("input")?.focus();
  }, []);
  A(function() {
    function handleKeydown(event) {
      if (event.key.toLowerCase() !== "s" || !(event.metaKey || event.ctrlKey)) return;
      event.preventDefault();
      formRef.current?.requestSubmit();
    }
    document.addEventListener("keydown", handleKeydown);
    return function() {
      document.removeEventListener("keydown", handleKeydown);
    };
  }, []);
  function updateTitles(update) {
    setDraft(function(current) {
      return { ...current, titles: update(current.titles) };
    });
  }
  function updateEnvironment(index, patch) {
    setDraft(function(current) {
      return {
        ...current,
        environments: current.environments.map(function(environment, position) {
          return position === index ? { ...environment, ...patch } : environment;
        })
      };
    });
  }
  async function handleSubmit(event) {
    event.preventDefault();
    if (problem || saving) return;
    setSaving(true);
    try {
      await props.onSave(draft);
    } finally {
      setSaving(false);
    }
  }
  return /* @__PURE__ */ u$1(
    DrawerShell,
    {
      eyebrow: props.entry ? "编辑系统" : "新增系统",
      title: props.entry ? props.entry.name || "未命名系统" : "新的系统",
      subtitle: props.entry ? "" : "填写名称和至少一条环境记录；保存后页面按环境匹配到该系统。",
      onClose: props.onCancel,
      footer: /* @__PURE__ */ u$1(M, { children: [
        /* @__PURE__ */ u$1("span", { class: "dm-drawer-foot-hint", children: problem || "⌘/Ctrl + S 保存" }),
        /* @__PURE__ */ u$1("span", { class: "dm-drawer-foot-spacer" }),
        /* @__PURE__ */ u$1("button", { type: "button", class: "dm-secondary-btn", onClick: props.onCancel, children: "取消" }),
        /* @__PURE__ */ u$1("button", { type: "submit", form: formId, class: "dm-primary-btn", disabled: !!problem || saving, children: "保存" })
      ] }),
      children: /* @__PURE__ */ u$1(
        "form",
        {
          id: formId,
          ref: formRef,
          class: "dm-editor",
          onSubmit: function(event) {
            void handleSubmit(event);
          },
          children: [
            props.entry && props.liveEntry === null ? /* @__PURE__ */ u$1("div", { class: "dm-banner is-warning", role: "status", children: [
              /* @__PURE__ */ u$1(Icon, { name: "circle-alert" }),
              /* @__PURE__ */ u$1("span", { class: "dm-banner-text", children: "这个系统已在其他页面被删除，保存后将重新创建。" })
            ] }) : null,
            props.entry && props.liveEntry && props.liveEntry.updatedAt !== props.entry.updatedAt ? /* @__PURE__ */ u$1("div", { class: "dm-banner is-info", role: "status", children: [
              /* @__PURE__ */ u$1(Icon, { name: "circle-alert" }),
              /* @__PURE__ */ u$1("span", { class: "dm-banner-text", children: "这个系统已在其他页面更新，保存将覆盖那次修改。" }),
              props.onLoadLatest ? /* @__PURE__ */ u$1("button", { type: "button", class: "dm-link-btn", onClick: props.onLoadLatest, children: "载入最新" }) : null
            ] }) : null,
            /* @__PURE__ */ u$1("section", { class: "dm-detail-group", children: [
              /* @__PURE__ */ u$1("h3", { class: "dm-detail-group-title", children: "基本信息" }),
              /* @__PURE__ */ u$1("label", { class: "dm-form-field", children: [
                /* @__PURE__ */ u$1("span", { class: "dm-form-label", children: "名称" }),
                /* @__PURE__ */ u$1(
                  "input",
                  {
                    class: "dm-input",
                    type: "text",
                    maxLength: NAME_MAX_LENGTH,
                    value: draft.name,
                    placeholder: "如：客户管理系统",
                    onInput: function(event) {
                      const value = event.currentTarget.value;
                      setDraft(function(current) {
                        return { ...current, name: value };
                      });
                    }
                  }
                )
              ] })
            ] }),
            /* @__PURE__ */ u$1("section", { class: "dm-detail-group is-compact", children: [
              /* @__PURE__ */ u$1("h3", { class: "dm-detail-group-title", children: "标题关键词" }),
              /* @__PURE__ */ u$1("p", { class: "dm-form-hint", children: "页面标题包含任一关键词时归入该系统。「Vite App」等通用标题不能作为关键词。" }),
              draft.titles.map(function(title, index) {
                return /* @__PURE__ */ u$1("div", { class: "dm-row-field", children: [
                  /* @__PURE__ */ u$1(
                    "input",
                    {
                      class: "dm-input",
                      type: "text",
                      value: title,
                      placeholder: "如：客户管理",
                      "aria-label": "标题关键词 " + (index + 1),
                      onInput: function(event) {
                        const value = event.currentTarget.value;
                        updateTitles(function(titles) {
                          return titles.map(function(item, position) {
                            return position === index ? value : item;
                          });
                        });
                      }
                    }
                  ),
                  /* @__PURE__ */ u$1(
                    IconButton,
                    {
                      icon: "x",
                      label: "删除关键词",
                      onClick: function() {
                        updateTitles(function(titles) {
                          return titles.filter(function(_item, position) {
                            return position !== index;
                          });
                        });
                      }
                    }
                  )
                ] }, index);
              }),
              /* @__PURE__ */ u$1("div", { children: /* @__PURE__ */ u$1(
                "button",
                {
                  type: "button",
                  class: "dm-ghost-btn is-small",
                  onClick: function() {
                    updateTitles(function(titles) {
                      return titles.concat("");
                    });
                  },
                  children: [
                    /* @__PURE__ */ u$1(Icon, { name: "plus" }),
                    "添加关键词"
                  ]
                }
              ) })
            ] }),
            /* @__PURE__ */ u$1("section", { class: "dm-detail-group is-compact", children: [
              /* @__PURE__ */ u$1("h3", { class: "dm-detail-group-title", children: "环境" }),
              draft.environments.map(function(environment, index) {
                const prefix = "dm-env-" + index;
                return /* @__PURE__ */ u$1("div", { class: "dm-env-card", "data-env-index": index, children: [
                  /* @__PURE__ */ u$1("div", { class: "dm-env-card-head", children: [
                    /* @__PURE__ */ u$1("span", { class: "dm-env-card-title", children: [
                      "环境 ",
                      index + 1,
                      environment.autoAdded ? /* @__PURE__ */ u$1("span", { class: "dm-badge", children: "自动" }) : null
                    ] }),
                    /* @__PURE__ */ u$1(
                      IconButton,
                      {
                        icon: "trash-2",
                        label: "删除环境 " + (index + 1),
                        tone: "danger",
                        onClick: function() {
                          setDraft(function(current) {
                            return {
                              ...current,
                              environments: current.environments.filter(function(_item, position) {
                                return position !== index;
                              })
                            };
                          });
                        }
                      }
                    )
                  ] }),
                  /* @__PURE__ */ u$1("div", { class: "dm-env-grid", children: [
                    /* @__PURE__ */ u$1("div", { class: "dm-form-field", children: [
                      /* @__PURE__ */ u$1("label", { class: "dm-form-label", for: prefix + "-host", children: "hostname" }),
                      /* @__PURE__ */ u$1(
                        "input",
                        {
                          id: prefix + "-host",
                          class: "dm-input",
                          type: "text",
                          value: environment.hostname,
                          placeholder: "如：localhost 或 test.example.com",
                          onInput: function(event) {
                            updateEnvironment(index, { hostname: event.currentTarget.value });
                          }
                        }
                      )
                    ] }),
                    /* @__PURE__ */ u$1("div", { class: "dm-form-field", children: [
                      /* @__PURE__ */ u$1("label", { class: "dm-form-label", for: prefix + "-port", children: "端口" }),
                      /* @__PURE__ */ u$1(
                        "input",
                        {
                          id: prefix + "-port",
                          class: "dm-input",
                          type: "text",
                          inputMode: "numeric",
                          value: environment.port,
                          placeholder: "可留空",
                          onInput: function(event) {
                            updateEnvironment(index, { port: event.currentTarget.value });
                          }
                        }
                      )
                    ] }),
                    /* @__PURE__ */ u$1("div", { class: "dm-form-field is-wide", children: [
                      /* @__PURE__ */ u$1("label", { class: "dm-form-label", for: prefix + "-path", children: "末端 path（可选）" }),
                      /* @__PURE__ */ u$1(
                        "input",
                        {
                          id: prefix + "-path",
                          class: "dm-input",
                          type: "text",
                          value: environment.lastPath,
                          placeholder: "URL 路径的最后一段，如 login；留空则不参与匹配",
                          onInput: function(event) {
                            updateEnvironment(index, { lastPath: event.currentTarget.value });
                          }
                        }
                      )
                    ] })
                  ] }),
                  /* @__PURE__ */ u$1("div", { class: "dm-form-field", children: [
                    /* @__PURE__ */ u$1("span", { class: "dm-form-label", children: "标识参数（可选）" }),
                    environment.query.map(function(row, rowIndex) {
                      return /* @__PURE__ */ u$1("div", { class: "dm-query-row", children: [
                        /* @__PURE__ */ u$1(
                          "input",
                          {
                            class: "dm-input",
                            type: "text",
                            value: row.key,
                            placeholder: "参数名",
                            "aria-label": "环境 " + (index + 1) + " 参数名 " + (rowIndex + 1),
                            onInput: function(event) {
                              const value = event.currentTarget.value;
                              updateEnvironment(index, {
                                query: environment.query.map(function(item, position) {
                                  return position === rowIndex ? { ...item, key: value } : item;
                                })
                              });
                            }
                          }
                        ),
                        /* @__PURE__ */ u$1("span", { class: "dm-query-equals", "aria-hidden": "true", children: "=" }),
                        /* @__PURE__ */ u$1(
                          "input",
                          {
                            class: "dm-input",
                            type: "text",
                            value: row.value,
                            placeholder: "值",
                            "aria-label": "环境 " + (index + 1) + " 参数值 " + (rowIndex + 1),
                            onInput: function(event) {
                              const value = event.currentTarget.value;
                              updateEnvironment(index, {
                                query: environment.query.map(function(item, position) {
                                  return position === rowIndex ? { ...item, value } : item;
                                })
                              });
                            }
                          }
                        ),
                        /* @__PURE__ */ u$1(
                          IconButton,
                          {
                            icon: "x",
                            label: "删除参数",
                            onClick: function() {
                              updateEnvironment(index, {
                                query: environment.query.filter(function(_item, position) {
                                  return position !== rowIndex;
                                })
                              });
                            }
                          }
                        )
                      ] }, rowIndex);
                    }),
                    /* @__PURE__ */ u$1("div", { children: /* @__PURE__ */ u$1(
                      "button",
                      {
                        type: "button",
                        class: "dm-ghost-btn is-small",
                        onClick: function() {
                          updateEnvironment(index, { query: environment.query.concat({ key: "", value: "" }) });
                        },
                        children: [
                          /* @__PURE__ */ u$1(Icon, { name: "plus" }),
                          "添加参数"
                        ]
                      }
                    ) })
                  ] })
                ] }, index);
              }),
              /* @__PURE__ */ u$1("div", { children: /* @__PURE__ */ u$1(
                "button",
                {
                  type: "button",
                  class: "dm-ghost-btn is-small",
                  onClick: function() {
                    setDraft(function(current) {
                      return { ...current, environments: current.environments.concat(createBlankEnvironmentDraft()) };
                    });
                  },
                  children: [
                    /* @__PURE__ */ u$1(Icon, { name: "plus" }),
                    "添加环境"
                  ]
                }
              ) })
            ] })
          ]
        }
      )
    }
  );
}
function SystemsTable(props) {
  return /* @__PURE__ */ u$1("div", { class: "dm-table-shell", children: /* @__PURE__ */ u$1("table", { class: "dm-table dm-systems-table", children: [
    /* @__PURE__ */ u$1("thead", { children: /* @__PURE__ */ u$1("tr", { children: [
      /* @__PURE__ */ u$1("th", { children: "名称" }),
      /* @__PURE__ */ u$1("th", { children: "ID" }),
      /* @__PURE__ */ u$1("th", { class: "dm-col-number", children: "环境" }),
      /* @__PURE__ */ u$1("th", { children: "状态" }),
      /* @__PURE__ */ u$1("th", { class: "dm-col-number", children: "常用" }),
      /* @__PURE__ */ u$1("th", { class: "dm-col-number", children: "记录" }),
      /* @__PURE__ */ u$1("th", { class: "dm-col-number", children: "标注" }),
      /* @__PURE__ */ u$1("th", { class: "dm-col-actions", children: "操作" })
    ] }) }),
    /* @__PURE__ */ u$1("tbody", { children: props.systems.map(function(system) {
      const status = getSystemStatus(system, props.enabledMap);
      const stats = props.stats[system.id] || { favorites: 0, history: 0, annotations: 0 };
      return /* @__PURE__ */ u$1(
        "tr",
        {
          "data-system-id": system.id,
          tabIndex: 0,
          class: "dm-row" + (props.selectedId === system.id ? " is-selected" : ""),
          onClick: function() {
            props.onSelect(system.id);
          },
          onKeyDown: function(event) {
            if (event.key === "Enter" && event.target === event.currentTarget) props.onSelect(system.id);
          },
          children: [
            /* @__PURE__ */ u$1("td", { children: /* @__PURE__ */ u$1("div", { class: "dm-title-cell", children: [
              /* @__PURE__ */ u$1("span", { class: "dm-title-text", children: /* @__PURE__ */ u$1(Highlight, { text: system.name || "未命名系统", query: props.query }) }),
              system.titles.length ? /* @__PURE__ */ u$1("span", { class: "dm-title-note", title: system.titles.join("、"), children: /* @__PURE__ */ u$1(Highlight, { text: system.titles.join("、"), query: props.query }) }) : null
            ] }) }),
            /* @__PURE__ */ u$1("td", { children: /* @__PURE__ */ u$1("div", { class: "dm-id-cell", children: [
              /* @__PURE__ */ u$1("span", { class: "dm-cell-value is-mono", title: system.id, children: system.id }),
              /* @__PURE__ */ u$1(IconButton, { icon: "copy", label: "复制系统 ID", onClick: function() {
                props.onCopyId(system.id);
              } })
            ] }) }),
            /* @__PURE__ */ u$1("td", { class: "dm-col-number", children: system.environments.length }),
            /* @__PURE__ */ u$1("td", { children: /* @__PURE__ */ u$1("span", { class: "dm-status is-" + status, children: SYSTEM_STATUS_LABELS[status] }) }),
            /* @__PURE__ */ u$1("td", { class: "dm-col-number", children: stats.favorites }),
            /* @__PURE__ */ u$1("td", { class: "dm-col-number", children: stats.history }),
            /* @__PURE__ */ u$1("td", { class: "dm-col-number", children: stats.annotations }),
            /* @__PURE__ */ u$1("td", { class: "dm-col-actions", children: /* @__PURE__ */ u$1("div", { class: "dm-row-actions", children: [
              /* @__PURE__ */ u$1(IconButton, { icon: "pencil", label: "编辑", onClick: function() {
                props.onEdit(system.id);
              } }),
              /* @__PURE__ */ u$1(IconButton, { icon: "trash-2", label: "删除", tone: "danger", onClick: function() {
                props.onDelete(system.id);
              } })
            ] }) })
          ]
        },
        system.id
      );
    }) })
  ] }) });
}
const VIEW_LABELS = {
  favorites: "常用数据",
  history: "生成记录",
  systems: "系统标注"
};
function Toolbar(props) {
  const views = Object.keys(VIEW_LABELS);
  return /* @__PURE__ */ u$1("div", { class: "dm-toolbar", children: [
    /* @__PURE__ */ u$1("div", { class: "dm-tabs", role: "tablist", "aria-label": "数据管理视图", children: views.map(function(item) {
      const active = item === props.view;
      return /* @__PURE__ */ u$1(
        "button",
        {
          type: "button",
          class: "dm-tab",
          role: "tab",
          "data-view": item,
          "aria-selected": active,
          tabIndex: active ? 0 : -1,
          onClick: function() {
            props.onViewChange(item);
          },
          onKeyDown: function(event) {
            if (event.key !== "ArrowLeft" && event.key !== "ArrowRight") return;
            event.preventDefault();
            const offset = event.key === "ArrowLeft" ? -1 : 1;
            const next = views[(views.indexOf(item) + offset + views.length) % views.length];
            if (!next) return;
            props.onViewChange(next);
            event.currentTarget.parentElement?.querySelector('[data-view="' + next + '"]')?.focus();
          },
          children: [
            VIEW_LABELS[item],
            /* @__PURE__ */ u$1("span", { class: "dm-tab-count", children: props.counts[item] })
          ]
        },
        item
      );
    }) }),
    /* @__PURE__ */ u$1("div", { class: "dm-toolbar-right", children: [
      props.hint ? /* @__PURE__ */ u$1("span", { class: "dm-toolbar-hint", children: props.hint }) : null,
      props.children
    ] })
  ] });
}
function getStorageArea() {
  try {
    return typeof chrome !== "undefined" && chrome.storage && chrome.storage.local ? chrome.storage.local : null;
  } catch (_error) {
    return null;
  }
}
function useColumnPreferences() {
  const [columns, setColumns] = d(normalizeColumnPreferences(DEFAULT_COLUMNS));
  A(function() {
    const storageArea = getStorageArea();
    if (!storageArea) return;
    storageArea.get([COLUMN_PREFERENCES_STORAGE_KEY], function(result) {
      setColumns(normalizeColumnPreferences(result ? result[COLUMN_PREFERENCES_STORAGE_KEY] : void 0));
    });
  }, []);
  const setViewColumns = j(function(view, nextColumns) {
    setColumns(function(current) {
      const next = normalizeColumnPreferences({ ...current, [view]: nextColumns });
      getStorageArea()?.set({ [COLUMN_PREFERENCES_STORAGE_KEY]: next });
      return next;
    });
  }, []);
  return { columns, setViewColumns };
}
function useConfirm() {
  const [pending, setPending] = d(null);
  const confirm = j(function(options) {
    return new Promise(function(resolve) {
      setPending({ ...options, resolve });
    });
  }, []);
  function settle(confirmed) {
    if (!pending) return;
    pending.resolve(confirmed);
    setPending(null);
  }
  const confirmDialog = pending ? /* @__PURE__ */ u$1(
    Dialog,
    {
      title: pending.title,
      description: pending.description,
      onClose: function() {
        settle(false);
      },
      footer: /* @__PURE__ */ u$1(M, { children: [
        /* @__PURE__ */ u$1("button", { type: "button", class: "dm-secondary-btn", "data-autofocus": true, onClick: function() {
          settle(false);
        }, children: pending.cancelLabel || "取消" }),
        /* @__PURE__ */ u$1(
          "button",
          {
            type: "button",
            class: pending.danger ? "dm-danger-btn" : "dm-primary-btn",
            onClick: function() {
              settle(true);
            },
            children: pending.confirmLabel || "确定"
          }
        )
      ] })
    }
  ) : null;
  return { confirm, confirmDialog };
}
const FRESH_HIGHLIGHT_MS = 2400;
function useRecords(scope) {
  const [records, setRecords] = d({ favorites: [], history: [], loaded: false });
  const [freshHistoryIds, setFreshHistoryIds] = d(/* @__PURE__ */ new Set());
  const knownHistoryIdsRef = T(null);
  const freshTimerRef = T(null);
  const latestRequestRef = T(0);
  const reload = j(async function() {
    if (!scope) {
      setRecords({ favorites: [], history: [], loaded: true });
      return;
    }
    const requestId = latestRequestRef.current + 1;
    latestRequestRef.current = requestId;
    const [favorites, history] = await Promise.all([readFavoriteProfiles(scope), readGeneratedProfiles(scope)]);
    if (requestId !== latestRequestRef.current) return;
    const knownIds = knownHistoryIdsRef.current;
    const freshIds = knownIds ? history.filter(function(entry) {
      return !knownIds.has(entry.id);
    }).map(function(entry) {
      return entry.id;
    }) : [];
    knownHistoryIdsRef.current = new Set(history.map(function(entry) {
      return entry.id;
    }));
    setRecords({ favorites, history, loaded: true });
    if (freshIds.length) {
      setFreshHistoryIds(new Set(freshIds));
      if (freshTimerRef.current) window.clearTimeout(freshTimerRef.current);
      freshTimerRef.current = window.setTimeout(function() {
        setFreshHistoryIds(/* @__PURE__ */ new Set());
        freshTimerRef.current = null;
      }, FRESH_HIGHLIGHT_MS);
    }
  }, [scope]);
  const setFavorites = j(function(entries) {
    setRecords(function(current) {
      return { ...current, favorites: entries };
    });
  }, []);
  A(function() {
    void reload();
  }, [reload]);
  A(function() {
    if (!scope || typeof chrome === "undefined" || !chrome.storage || !chrome.storage.onChanged) return;
    function handleChange(changes, areaName) {
      if (areaName !== "local") return;
      if (!changes[FAVORITE_PROFILES_STORAGE_KEY] && !changes[GENERATED_PROFILES_STORAGE_KEY]) return;
      void reload();
    }
    chrome.storage.onChanged.addListener(handleChange);
    return function() {
      chrome.storage.onChanged.removeListener(handleChange);
    };
  }, [scope, reload]);
  A(function() {
    return function() {
      if (freshTimerRef.current) window.clearTimeout(freshTimerRef.current);
    };
  }, []);
  return { ...records, freshHistoryIds, reload, setFavorites };
}
const WATCHED_KEYS = [
  SYSTEM_PROFILES_STORAGE_KEY,
  SITE_FEATURE_STORAGE_KEY,
  OVERRIDES_STORAGE_KEY,
  FAVORITE_PROFILES_STORAGE_KEY,
  GENERATED_PROFILES_STORAGE_KEY
];
function readEnabledMap(value) {
  const map = {};
  if (!value || typeof value !== "object" || Array.isArray(value)) return map;
  Object.entries(value).forEach(function([scope, enabled]) {
    if (typeof enabled === "boolean") map[scope] = enabled;
  });
  return map;
}
function useSystems() {
  const [state, setState] = d({ systems: [], enabledMap: {}, stats: {}, loaded: false });
  const latestRequestRef = T(0);
  const reload = j(async function() {
    const requestId = latestRequestRef.current + 1;
    latestRequestRef.current = requestId;
    const [systems, enabled, overrides, summaries] = await Promise.all([
      readSystems(),
      readStorageValue(void 0, SITE_FEATURE_STORAGE_KEY),
      readStorageValue(void 0, OVERRIDES_STORAGE_KEY),
      listScopeSummaries()
    ]);
    if (requestId !== latestRequestRef.current) return;
    const annotations = countAnnotationsBySystem(overrides);
    const summaryByScope = new Map(summaries.map(function(summary) {
      return [summary.scope, summary];
    }));
    const stats = {};
    systems.forEach(function(system) {
      const summary = summaryByScope.get("system:" + system.id);
      stats[system.id] = {
        favorites: summary ? summary.favorites : 0,
        history: summary ? summary.history : 0,
        annotations: annotations[system.id] || 0
      };
    });
    setState({ systems, enabledMap: readEnabledMap(enabled), stats, loaded: true });
  }, []);
  A(function() {
    void reload();
  }, [reload]);
  A(function() {
    if (typeof chrome === "undefined" || !chrome.storage || !chrome.storage.onChanged) return;
    function handleChange(changes, areaName) {
      if (areaName !== "local") return;
      if (!WATCHED_KEYS.some(function(key) {
        return !!changes[key];
      })) return;
      void reload();
    }
    chrome.storage.onChanged.addListener(handleChange);
    return function() {
      chrome.storage.onChanged.removeListener(handleChange);
    };
  }, [reload]);
  const save = j(async function(system) {
    const result = await saveSystem(system);
    if (result.ok) await reload();
    return result;
  }, [reload]);
  const remove = j(async function(id, targetScope) {
    await deleteSystem(id, targetScope);
    await reload();
  }, [reload]);
  const dismiss = j(async function(id) {
    await dismissAnomalies(id);
    await reload();
  }, [reload]);
  return { ...state, reload, save, remove, dismiss };
}
const TOAST_DURATION_MS = 2400;
function useToast() {
  const [toast, setToast] = d(null);
  const timerRef = T(null);
  const showToast = j(function(message, tone = "info") {
    if (timerRef.current) window.clearTimeout(timerRef.current);
    setToast({ id: Date.now(), message, tone });
    timerRef.current = window.setTimeout(function() {
      setToast(null);
      timerRef.current = null;
    }, TOAST_DURATION_MS);
  }, []);
  A(function() {
    return function() {
      if (timerRef.current) window.clearTimeout(timerRef.current);
    };
  }, []);
  return { toast, showToast };
}
function App() {
  const route = b(function() {
    return parseDataManagerPageLocation(window.location.search);
  }, []);
  const scope = route.scope;
  const [view, setView] = d(route.view);
  const [query, setQuery] = d("");
  const [drawer, setDrawer] = d(null);
  const [copyTargetId, setCopyTargetId] = d(null);
  const [deleteSystemId, setDeleteSystemId] = d(null);
  const routeSystemHandledRef = T(false);
  const [importPreview, setImportPreview] = d(null);
  const importInputRef = T(null);
  const editorDirtyRef = T(false);
  const searchInputRef = T(null);
  const records = useRecords(scope);
  const systemsState = useSystems();
  const { columns, setViewColumns } = useColumnPreferences();
  const { toast, showToast } = useToast();
  const { confirm, confirmDialog } = useConfirm();
  const visibleFavorites = records.favorites.filter(function(entry) {
    return matchesQuery(entry.profile, [getFavoriteTitle(entry), entry.note], query);
  });
  const visibleHistory = records.history.filter(function(entry) {
    return matchesQuery(entry.profile, [formatDisplayTime(entry.createdAt)], query);
  });
  const visibleSystems = systemsState.systems.filter(function(system) {
    return matchesSystemQuery(system, query);
  });
  const favoriteIdByHistoryId = /* @__PURE__ */ new Map();
  records.history.forEach(function(historyEntry) {
    const favorite = records.favorites.find(function(entry) {
      return isSameProfile(entry.profile, historyEntry.profile);
    });
    if (favorite) favoriteIdByHistoryId.set(historyEntry.id, favorite.id);
  });
  const favoritedHistoryIds = new Set(favoriteIdByHistoryId.keys());
  const copyTarget = copyTargetId ? records.favorites.find(function(entry) {
    return entry.id === copyTargetId;
  }) || null : null;
  const drawerFavoriteId = drawer && (drawer.mode === "edit" || drawer.mode === "view" && drawer.view === "favorites") ? drawer.id : null;
  const drawerFavorite = drawerFavoriteId ? records.favorites.find(function(entry) {
    return entry.id === drawerFavoriteId;
  }) || null : null;
  const drawerHistory = drawer && drawer.mode === "view" && drawer.view === "history" ? records.history.find(function(entry) {
    return entry.id === drawer.id;
  }) || null : null;
  const drawerSystemId = drawer && drawer.mode === "view" && drawer.view === "systems" ? drawer.id : null;
  const drawerSystem = drawerSystemId ? systemsState.systems.find(function(system) {
    return system.id === drawerSystemId;
  }) || null : null;
  const editingSystemId = drawer && drawer.mode === "system-edit" && drawer.snapshot ? drawer.snapshot.id : null;
  const editingSystemLive = editingSystemId ? systemsState.systems.find(function(system) {
    return system.id === editingSystemId;
  }) || null : void 0;
  const deleteSystemTarget = deleteSystemId ? systemsState.systems.find(function(system) {
    return system.id === deleteSystemId;
  }) || null : null;
  const selectedSystemId = drawerSystemId || editingSystemId;
  A(function() {
    if (!window.history || typeof window.history.replaceState !== "function") return;
    window.history.replaceState(null, "", buildDataManagerPageUrl(window.location.href, scope, view));
  }, [scope, view]);
  A(function() {
    if (routeSystemHandledRef.current || !route.systemId || route.view !== "systems" || !systemsState.loaded) return;
    routeSystemHandledRef.current = true;
    const target = systemsState.systems.find(function(system) {
      return system.id === route.systemId;
    });
    if (target) {
      setDrawer({ mode: "system-edit", snapshot: target });
    } else {
      showToast("没有找到要管理的系统，可能已被删除", "warning");
    }
  }, [systemsState.loaded]);
  A(function() {
    function handleKeydown(event) {
      if (event.defaultPrevented || confirmDialog || copyTarget || importPreview || deleteSystemTarget) return;
      const target = event.target;
      const typing = !!target && (target.tagName === "INPUT" || target.tagName === "TEXTAREA" || target.isContentEditable);
      if (event.key === "/" && !typing && (scope || view === "systems")) {
        event.preventDefault();
        searchInputRef.current?.focus();
        return;
      }
      if (event.key === "Escape" && drawer) {
        event.preventDefault();
        void changeDrawer(null);
      }
    }
    document.addEventListener("keydown", handleKeydown);
    return function() {
      document.removeEventListener("keydown", handleKeydown);
    };
  });
  A(function() {
    function handleBeforeUnload(event) {
      if (!editorDirtyRef.current) return;
      event.preventDefault();
      event.returnValue = "";
    }
    window.addEventListener("beforeunload", handleBeforeUnload);
    return function() {
      window.removeEventListener("beforeunload", handleBeforeUnload);
    };
  }, []);
  async function runSafely(task) {
    try {
      await task();
    } catch (_error) {
      showToast("操作失败，请重试", "danger");
    }
  }
  async function changeDrawer(next) {
    const editing = drawer && (drawer.mode === "edit" || drawer.mode === "create" || drawer.mode === "system-edit");
    if (editing && editorDirtyRef.current) {
      const discard = await confirm({
        title: "放弃未保存的修改？",
        description: "当前编辑的内容尚未保存，离开后将丢失。",
        confirmLabel: "放弃修改",
        cancelLabel: "继续编辑",
        danger: true
      });
      if (!discard) return false;
    }
    editorDirtyRef.current = false;
    setDrawer(next);
    return true;
  }
  async function copyProfile(profile) {
    if (await copyText(formatProfileForCopy(profile))) {
      showToast("已复制整组数据", "success");
    } else {
      showToast("自动复制失败，请手动复制", "warning");
    }
  }
  async function copyField(fieldKey, value) {
    if (await copyText(value)) {
      showToast("已复制" + getFieldLabel(fieldKey), "success");
    } else {
      showToast("自动复制失败，请手动复制", "warning");
    }
  }
  function handleCopyField(fieldKey, value) {
    void copyField(fieldKey, value);
  }
  function toggleRow(rowView, id) {
    const isOpen = drawer && drawer.mode === "view" && drawer.view === rowView && drawer.id === id;
    void changeDrawer(isOpen ? null : { mode: "view", view: rowView, id });
  }
  async function handleSave(draft) {
    if (!drawer || drawer.mode !== "edit" && drawer.mode !== "create") return;
    try {
      const updated = drawer.mode === "edit" ? await updateFavoriteProfile(scope, drawer.id, draft) : null;
      if (updated) {
        showToast("常用数据已更新", "success");
        editorDirtyRef.current = false;
        setDrawer({ mode: "view", view: "favorites", id: updated.id });
      } else {
        const created = await createFavoriteProfile(scope, draft);
        showToast("已新增常用数据", "success");
        editorDirtyRef.current = false;
        setDrawer({ mode: "view", view: "favorites", id: created.id });
      }
      await records.reload();
    } catch (_error) {
      showToast("保存失败，请重试", "danger");
    }
  }
  async function handleDelete(id) {
    const entry = records.favorites.find(function(item) {
      return item.id === id;
    });
    if (!entry) return;
    const confirmed = await confirm({
      title: "删除常用数据",
      description: "确认删除「" + getFavoriteTitle(entry) + "」？删除后无法恢复。",
      confirmLabel: "删除",
      danger: true
    });
    if (!confirmed) return;
    await deleteFavoriteProfile(scope, id);
    if (drawerFavoriteId === id) setDrawer(null);
    await records.reload();
    showToast("已删除常用数据", "success");
  }
  async function handleReorder(orderedIds) {
    records.setFavorites(await reorderFavoriteProfiles(scope, orderedIds));
    showToast("常用数据顺序已保存", "success");
  }
  async function handleHistoryFavorite(id) {
    const favoriteId = favoriteIdByHistoryId.get(id);
    if (favoriteId) {
      if (!await changeDrawer({ mode: "view", view: "favorites", id: favoriteId })) return;
      setQuery("");
      setView("favorites");
      return;
    }
    const created = await createFavoriteFromHistory(scope, id);
    if (!created) return;
    await records.reload();
    showToast("已收藏为常用数据", "success");
  }
  async function copySystemId(id) {
    if (await copyText(id)) {
      showToast("已复制系统 ID", "success");
    } else {
      showToast("自动复制失败，请手动复制", "warning");
    }
  }
  async function handleSaveSystem(draft) {
    if (!drawer || drawer.mode !== "system-edit") return;
    try {
      const snapshot = drawer.snapshot;
      const live = snapshot ? systemsState.systems.find(function(system) {
        return system.id === snapshot.id;
      }) || snapshot : null;
      const built = buildSystemFromDraft(draft, live);
      const result = await systemsState.save(built);
      if (!result.ok) {
        showToast(result.message || "保存失败，请重试", "danger");
        return;
      }
      showToast(snapshot ? "系统已更新" : "已新增系统", "success");
      editorDirtyRef.current = false;
      setDrawer({ mode: "view", view: "systems", id: built.id });
    } catch (_error) {
      showToast("保存失败，请重试", "danger");
    }
  }
  async function handleDeleteSystem(targetScope) {
    const target = deleteSystemTarget;
    if (!target) return;
    try {
      await systemsState.remove(target.id, targetScope);
      if (selectedSystemId === target.id) {
        editorDirtyRef.current = false;
        setDrawer(null);
      }
      setDeleteSystemId(null);
      showToast("已删除系统，数据已退回「" + formatScopeLabel(targetScope, []) + "」", "success");
    } catch (_error) {
      showToast("删除失败，请重试", "danger");
    }
  }
  async function handleCopyToSites(targetScopes) {
    if (!copyTarget) return;
    try {
      const results = await copyFavoriteToScopes(scope, copyTarget.id, targetScopes);
      if (!results) {
        showToast("这组常用数据已不存在", "warning");
      } else {
        const summary = summarizeCopyResults(results, function(target) {
          return formatScopeLabel(target, systemsState.systems);
        });
        showToast(summary.message, summary.tone);
      }
      setCopyTargetId(null);
    } catch (_error) {
      showToast("复制失败，请重试", "danger");
    }
  }
  function handleExport() {
    if (!records.favorites.length) return;
    const now = /* @__PURE__ */ new Date();
    const blob = new Blob([JSON.stringify(buildExportPayload(scope, records.favorites, now), null, 2)], {
      type: "application/json"
    });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = buildExportFileName(scope, now);
    document.body.appendChild(link);
    link.click();
    link.remove();
    window.setTimeout(function() {
      URL.revokeObjectURL(url);
    }, 1e3);
    showToast("已导出 " + records.favorites.length + " 条常用数据", "success");
  }
  async function handleImportFile(file) {
    const parsed = parseImportPayload(await file.text());
    if (!parsed.ok) {
      showToast(parsed.error, "danger");
      return;
    }
    const plan = planImport(records.favorites, parsed.favorites);
    setImportPreview({ fileName: file.name, sourceScope: parsed.sourceScope, ...plan });
  }
  async function confirmImport() {
    if (!importPreview) return;
    try {
      const result = await importFavoriteProfiles(scope, importPreview.toCreate);
      setImportPreview(null);
      await records.reload();
      showToast(
        "已导入 " + result.created.length + " 条常用数据" + (result.skipped ? "，跳过 " + result.skipped + " 条重复数据" : ""),
        "success"
      );
    } catch (_error) {
      showToast("导入失败，请重试", "danger");
    }
  }
  function startEdit(entry) {
    void changeDrawer({ mode: "edit", id: entry.id, snapshot: entry });
  }
  function openCreate() {
    void changeDrawer({ mode: "create" });
  }
  function openCreateSystem() {
    void changeDrawer({ mode: "system-edit", snapshot: null });
  }
  function startEditSystem(system) {
    void changeDrawer({ mode: "system-edit", snapshot: system });
  }
  function renderNoMatch() {
    return /* @__PURE__ */ u$1(EmptyState, { icon: "search", title: "没有匹配的数据", description: "没有找到包含「" + query.trim() + "」的数据。", children: /* @__PURE__ */ u$1("button", { type: "button", class: "dm-secondary-btn", onClick: function() {
      setQuery("");
    }, children: "清空搜索" }) });
  }
  function renderDrawer() {
    if (!drawer) return null;
    if (drawer.mode === "system-edit") {
      const snapshot = drawer.snapshot;
      return /* @__PURE__ */ u$1(
        SystemEditor,
        {
          entry: snapshot,
          liveEntry: snapshot ? editingSystemLive : void 0,
          onLoadLatest: function() {
            if (editingSystemLive) {
              editorDirtyRef.current = false;
              setDrawer({ mode: "system-edit", snapshot: editingSystemLive });
            }
          },
          onCancel: function() {
            void changeDrawer(snapshot ? { mode: "view", view: "systems", id: snapshot.id } : null);
          },
          onSave: handleSaveSystem,
          onDirtyChange: function(dirty) {
            editorDirtyRef.current = dirty;
          }
        },
        snapshot ? "edit-" + snapshot.id + "-" + snapshot.updatedAt : "create-system"
      );
    }
    if (drawerSystem) {
      const system = drawerSystem;
      const stats = systemsState.stats[system.id] || { favorites: 0, history: 0, annotations: 0 };
      return /* @__PURE__ */ u$1(
        DrawerShell,
        {
          eyebrow: "系统",
          title: system.name || "未命名系统",
          subtitle: system.titles.join("、"),
          onClose: function() {
            void changeDrawer(null);
          },
          footer: /* @__PURE__ */ u$1(M, { children: [
            /* @__PURE__ */ u$1("button", { type: "button", class: "dm-secondary-btn", onClick: function() {
              startEditSystem(system);
            }, children: [
              /* @__PURE__ */ u$1(Icon, { name: "pencil" }),
              "编辑"
            ] }),
            /* @__PURE__ */ u$1("span", { class: "dm-drawer-foot-spacer" }),
            /* @__PURE__ */ u$1(IconButton, { icon: "trash-2", label: "删除", tone: "danger", onClick: function() {
              setDeleteSystemId(system.id);
            } })
          ] }),
          children: /* @__PURE__ */ u$1(
            SystemDetails,
            {
              system,
              systems: systemsState.systems,
              stats,
              onCopyId: function(id) {
                void copySystemId(id);
              },
              onDismissAnomalies: function(id) {
                void runSafely(function() {
                  return systemsState.dismiss(id);
                });
              }
            }
          )
        }
      );
    }
    if (drawer.mode === "create" || drawer.mode === "edit") {
      const snapshot = drawer.mode === "edit" ? drawer.snapshot : null;
      return /* @__PURE__ */ u$1(
        FavoriteEditor,
        {
          entry: snapshot,
          liveEntry: snapshot ? drawerFavorite : void 0,
          onLoadLatest: function() {
            if (drawerFavorite) {
              editorDirtyRef.current = false;
              setDrawer({ mode: "edit", id: drawerFavorite.id, snapshot: drawerFavorite });
            }
          },
          favorites: records.favorites,
          onCancel: function() {
            void changeDrawer(drawer.mode === "edit" ? { mode: "view", view: "favorites", id: drawer.id } : null);
          },
          onSave: handleSave,
          onDirtyChange: function(dirty) {
            editorDirtyRef.current = dirty;
          },
          onShowExisting: function(id) {
            void changeDrawer({ mode: "view", view: "favorites", id });
          }
        },
        snapshot ? "edit-" + snapshot.id + "-" + snapshot.updatedAt : "create"
      );
    }
    if (drawerFavorite) {
      const entry = drawerFavorite;
      return /* @__PURE__ */ u$1(
        DrawerShell,
        {
          eyebrow: "常用数据",
          title: getFavoriteTitle(entry),
          subtitle: entry.note,
          onClose: function() {
            void changeDrawer(null);
          },
          footer: /* @__PURE__ */ u$1(M, { children: [
            /* @__PURE__ */ u$1("button", { type: "button", class: "dm-secondary-btn", onClick: function() {
              void copyProfile(entry.profile);
            }, children: [
              /* @__PURE__ */ u$1(Icon, { name: "copy" }),
              "复制整组"
            ] }),
            /* @__PURE__ */ u$1("button", { type: "button", class: "dm-secondary-btn", onClick: function() {
              startEdit(entry);
            }, children: [
              /* @__PURE__ */ u$1(Icon, { name: "pencil" }),
              "编辑"
            ] }),
            /* @__PURE__ */ u$1("button", { type: "button", class: "dm-secondary-btn", onClick: function() {
              setCopyTargetId(entry.id);
            }, children: [
              /* @__PURE__ */ u$1(Icon, { name: "copy-plus" }),
              "复制到其他站点"
            ] }),
            /* @__PURE__ */ u$1("span", { class: "dm-drawer-foot-spacer" }),
            /* @__PURE__ */ u$1(
              IconButton,
              {
                icon: "trash-2",
                label: "删除",
                tone: "danger",
                onClick: function() {
                  void runSafely(function() {
                    return handleDelete(entry.id);
                  });
                }
              }
            )
          ] }),
          children: /* @__PURE__ */ u$1(ProfileDetails, { profile: entry.profile, onCopyField: handleCopyField })
        }
      );
    }
    if (drawerHistory) {
      const entry = drawerHistory;
      const favorited = favoritedHistoryIds.has(entry.id);
      return /* @__PURE__ */ u$1(
        DrawerShell,
        {
          eyebrow: "生成记录",
          badge: favorited ? "已收藏" : "",
          title: entry.profile.fullName || "生成记录",
          subtitle: "生成于 " + formatDisplayTime(entry.createdAt),
          onClose: function() {
            void changeDrawer(null);
          },
          footer: /* @__PURE__ */ u$1(M, { children: [
            /* @__PURE__ */ u$1("button", { type: "button", class: "dm-secondary-btn", onClick: function() {
              void copyProfile(entry.profile);
            }, children: [
              /* @__PURE__ */ u$1(Icon, { name: "copy" }),
              "复制整组"
            ] }),
            /* @__PURE__ */ u$1(
              "button",
              {
                type: "button",
                class: "dm-secondary-btn",
                onClick: function() {
                  void runSafely(function() {
                    return handleHistoryFavorite(entry.id);
                  });
                },
                children: [
                  /* @__PURE__ */ u$1(Icon, { name: "star" }),
                  favorited ? "查看常用数据" : "收藏"
                ]
              }
            )
          ] }),
          children: /* @__PURE__ */ u$1(ProfileDetails, { profile: entry.profile, onCopyField: handleCopyField })
        }
      );
    }
    return null;
  }
  function renderSystemsWorkspace() {
    if (!systemsState.loaded) return null;
    if (!systemsState.systems.length) {
      return /* @__PURE__ */ u$1(
        EmptyState,
        {
          icon: "building-2",
          title: "还没有系统",
          description: "在目标网站打开 place-fill 并开启智能功能后，会自动记录系统；也可以手动新增，把多个环境归到同一个系统。",
          children: /* @__PURE__ */ u$1("button", { type: "button", class: "dm-primary-btn", onClick: openCreateSystem, children: [
            /* @__PURE__ */ u$1(Icon, { name: "plus" }),
            "新增系统"
          ] })
        }
      );
    }
    if (!visibleSystems.length) return renderNoMatch();
    return /* @__PURE__ */ u$1(
      SystemsTable,
      {
        systems: visibleSystems,
        enabledMap: systemsState.enabledMap,
        stats: systemsState.stats,
        query,
        selectedId: selectedSystemId,
        onSelect: function(id) {
          toggleRow("systems", id);
        },
        onCopyId: function(id) {
          void copySystemId(id);
        },
        onEdit: function(id) {
          const system = systemsState.systems.find(function(item) {
            return item.id === id;
          });
          if (system) startEditSystem(system);
        },
        onDelete: setDeleteSystemId
      }
    );
  }
  function renderWorkspace() {
    if (view === "systems") return renderSystemsWorkspace();
    if (!scope) {
      return /* @__PURE__ */ u$1(
        EmptyState,
        {
          icon: "globe",
          title: "未指定站点",
          description: "数据按站点隔离保存。请在目标网站打开 place-fill 面板，点击「数据管理」进入对应站点的数据。"
        }
      );
    }
    if (!records.loaded) return null;
    if (view === "history") {
      if (!records.history.length) {
        return /* @__PURE__ */ u$1(
          EmptyState,
          {
            icon: "refresh-cw",
            title: "还没有生成记录",
            description: "在当前站点的插件面板里生成数据后，记录会出现在这里，可复制或收藏为常用数据。"
          }
        );
      }
      if (!visibleHistory.length) return renderNoMatch();
      return /* @__PURE__ */ u$1(
        HistoryTable,
        {
          entries: visibleHistory,
          columns: columns.history,
          query,
          selectedId: drawerHistory ? drawerHistory.id : null,
          onSelect: function(id) {
            toggleRow("history", id);
          },
          onCopyField: handleCopyField,
          favoritedIds: favoritedHistoryIds,
          freshIds: records.freshHistoryIds,
          onFavorite: function(id) {
            void runSafely(function() {
              return handleHistoryFavorite(id);
            });
          },
          onCopy: function(id) {
            const entry = records.history.find(function(item) {
              return item.id === id;
            });
            if (entry) void copyProfile(entry.profile);
          }
        }
      );
    }
    if (!records.favorites.length) {
      return /* @__PURE__ */ u$1(
        EmptyState,
        {
          icon: "star",
          title: "还没有常用数据",
          description: "常用数据可在填表时优先推荐。你可以手动新增，或从生成记录中收藏。",
          children: /* @__PURE__ */ u$1("button", { type: "button", class: "dm-primary-btn", onClick: openCreate, children: [
            /* @__PURE__ */ u$1(Icon, { name: "plus" }),
            "新增常用数据"
          ] })
        }
      );
    }
    if (!visibleFavorites.length) return renderNoMatch();
    return /* @__PURE__ */ u$1(
      FavoritesTable,
      {
        entries: visibleFavorites,
        columns: columns.favorites,
        query,
        selectedId: drawerFavoriteId,
        sortable: !query.trim(),
        onSelect: function(id) {
          toggleRow("favorites", id);
        },
        onCopyField: handleCopyField,
        onCopyAll: function(id) {
          const entry = records.favorites.find(function(item) {
            return item.id === id;
          });
          if (entry) void copyProfile(entry.profile);
        },
        onEdit: function(id) {
          const entry = records.favorites.find(function(item) {
            return item.id === id;
          });
          if (entry) startEdit(entry);
        },
        onCopyToSites: setCopyTargetId,
        onDelete: function(id) {
          void runSafely(function() {
            return handleDelete(id);
          });
        },
        onReorder: function(orderedIds) {
          void runSafely(function() {
            return handleReorder(orderedIds);
          });
        }
      }
    );
  }
  return /* @__PURE__ */ u$1("div", { class: "dm-app", children: [
    /* @__PURE__ */ u$1(Header, { scope, systems: systemsState.systems, children: [
      view === "systems" ? /* @__PURE__ */ u$1("button", { type: "button", class: "dm-primary-btn", onClick: openCreateSystem, children: [
        /* @__PURE__ */ u$1(Icon, { name: "plus" }),
        "新增系统"
      ] }) : null,
      scope && view === "favorites" ? /* @__PURE__ */ u$1(M, { children: [
        /* @__PURE__ */ u$1(
          "button",
          {
            type: "button",
            class: "dm-ghost-btn",
            title: "从导出的 JSON 文件导入常用数据",
            onClick: function() {
              importInputRef.current?.click();
            },
            children: [
              /* @__PURE__ */ u$1(Icon, { name: "upload" }),
              "导入"
            ]
          }
        ),
        /* @__PURE__ */ u$1(
          "button",
          {
            type: "button",
            class: "dm-ghost-btn",
            title: "导出当前站点的常用数据",
            disabled: !records.favorites.length,
            onClick: handleExport,
            children: [
              /* @__PURE__ */ u$1(Icon, { name: "download" }),
              "导出"
            ]
          }
        ),
        /* @__PURE__ */ u$1("button", { type: "button", class: "dm-primary-btn", onClick: openCreate, children: [
          /* @__PURE__ */ u$1(Icon, { name: "plus" }),
          "新增"
        ] }),
        /* @__PURE__ */ u$1(
          "input",
          {
            ref: importInputRef,
            type: "file",
            accept: ".json,application/json",
            hidden: true,
            onChange: function(event) {
              const input = event.currentTarget;
              const file = input.files && input.files[0];
              input.value = "";
              if (file) void runSafely(function() {
                return handleImportFile(file);
              });
            }
          }
        )
      ] }) : null
    ] }),
    /* @__PURE__ */ u$1(
      Toolbar,
      {
        view,
        counts: {
          favorites: records.favorites.length,
          history: records.history.length,
          systems: systemsState.systems.length
        },
        hint: view === "history" ? "仅保留最近 " + MAX_GENERATED_RECORDS + " 条" : "",
        onViewChange: function(nextView) {
          if (nextView === view) return;
          void changeDrawer(null).then(function(changed) {
            if (!changed) return;
            if (nextView === "systems" || view === "systems") setQuery("");
            setView(nextView);
            void records.reload();
          });
        },
        children: [
          scope || view === "systems" ? /* @__PURE__ */ u$1(
            SearchBox,
            {
              inputRef: searchInputRef,
              value: query,
              onChange: setQuery,
              placeholder: view === "systems" ? "搜索系统名称、关键词、域名…" : void 0,
              label: view === "systems" ? "搜索系统" : void 0
            }
          ) : null,
          scope && view !== "systems" ? /* @__PURE__ */ u$1(
            ColumnPicker,
            {
              columns: columns[view],
              defaultColumns: DEFAULT_COLUMNS[view],
              onChange: function(nextColumns) {
                setViewColumns(view, nextColumns);
              }
            }
          ) : null
        ]
      }
    ),
    /* @__PURE__ */ u$1("div", { class: "dm-body", children: [
      /* @__PURE__ */ u$1("section", { class: "dm-main", role: "tabpanel", "aria-label": VIEW_LABELS[view], children: renderWorkspace() }),
      renderDrawer()
    ] }),
    toast ? /* @__PURE__ */ u$1("div", { class: "dm-toast", role: "status", "data-tone": toast.tone, children: toast.message }, toast.id) : null,
    copyTarget ? /* @__PURE__ */ u$1(
      CopyToSitesDialog,
      {
        scope,
        systems: systemsState.systems,
        title: getFavoriteTitle(copyTarget),
        onClose: function() {
          setCopyTargetId(null);
        },
        onConfirm: handleCopyToSites
      }
    ) : null,
    importPreview ? /* @__PURE__ */ u$1(
      ImportDialog,
      {
        scope,
        systems: systemsState.systems,
        ...importPreview,
        onClose: function() {
          setImportPreview(null);
        },
        onConfirm: confirmImport
      }
    ) : null,
    deleteSystemTarget ? /* @__PURE__ */ u$1(
      DeleteSystemDialog,
      {
        system: deleteSystemTarget,
        onClose: function() {
          setDeleteSystemId(null);
        },
        onConfirm: handleDeleteSystem
      }
    ) : null,
    confirmDialog
  ] });
}
const mountNode = document.getElementById("app");
if (mountNode) G$1(/* @__PURE__ */ u$1(App, {}), mountNode);
