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
function getStorageArea$1(env) {
  try {
    if (typeof chrome !== "undefined" && chrome.storage && chrome.storage.local) return chrome.storage.local;
  } catch (_error) {
  }
  return null;
}
function readStorageValue(storageArea, key) {
  if (!storageArea) return Promise.resolve(void 0);
  return new Promise(function(resolve) {
    storageArea.get([key], function(result) {
      resolve(result ? result[key] : void 0);
    });
  });
}
function writeStorageValue(storageArea, key, value) {
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
  return normalizeGeneratedProfilesMap(await readStorageValue(getStorageArea$1(), GENERATED_PROFILES_STORAGE_KEY));
}
async function writeGeneratedProfilesMap(nextMap, env) {
  await writeStorageValue(getStorageArea$1(), GENERATED_PROFILES_STORAGE_KEY, nextMap);
}
async function readFavoriteProfilesMap(env) {
  return normalizeFavoriteProfilesMap(await readStorageValue(getStorageArea$1(), FAVORITE_PROFILES_STORAGE_KEY));
}
async function writeFavoriteProfilesMap(nextMap, env) {
  await writeStorageValue(getStorageArea$1(), FAVORITE_PROFILES_STORAGE_KEY, nextMap);
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
  const recordsMap = await readGeneratedProfilesMap();
  const records = recordsMap[normalizedScope] ? recordsMap[normalizedScope].slice() : [];
  const historyEntry = records.find(function(entry) {
    return entry.id === historyId;
  });
  if (!historyEntry) return null;
  recordsMap[normalizedScope] = records.filter(function(entry) {
    return entry.id !== historyId;
  });
  const favorite = await createFavoriteProfile(normalizedScope, { name, profile: historyEntry.profile });
  await writeGeneratedProfilesMap(recordsMap);
  return favorite;
}
const DATA_MANAGER_PAGE_PATH = "data-manager.html";
function normalizeDataManagerView(value) {
  const normalized = String(value || "").trim().toLowerCase();
  return normalized === "history" ? "history" : "favorites";
}
function parseDataManagerPageLocation(search) {
  const params = typeof search === "string" ? new URLSearchParams(search) : search;
  return {
    scope: normalizeScopeKey(params.get("scope") || ""),
    view: normalizeDataManagerView(params.get("view"))
  };
}
function buildDataManagerPageUrl(baseUrl, scope, view) {
  const url = new URL(DATA_MANAGER_PAGE_PATH, baseUrl);
  const normalizedScope = normalizeScopeKey(scope);
  const normalizedView = normalizeDataManagerView(view);
  if (normalizedScope) {
    url.searchParams.set("scope", normalizedScope);
  } else {
    url.searchParams.delete("scope");
  }
  url.searchParams.set("view", normalizedView);
  return url.toString();
}
async function copyText(text) {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch (_error) {
    const textarea = document.createElement("textarea");
    textarea.value = text;
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
function splitHighlight(text, query) {
  const value = String(text || "");
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
function Popover(props) {
  const [open, setOpen] = d(false);
  const rootRef = T(null);
  A(function() {
    if (!open) return;
    function handlePointerDown(event) {
      if (rootRef.current && !rootRef.current.contains(event.target)) setOpen(false);
    }
    document.addEventListener("pointerdown", handlePointerDown);
    return function() {
      document.removeEventListener("pointerdown", handlePointerDown);
    };
  }, [open]);
  function close() {
    setOpen(false);
    rootRef.current?.querySelector(".dm-popover-trigger")?.focus();
  }
  return /* @__PURE__ */ u$1(
    "div",
    {
      ref: rootRef,
      class: "dm-popover-root",
      onKeyDown: function(event) {
        if (event.key !== "Escape" || !open) return;
        event.stopPropagation();
        close();
      },
      children: [
        /* @__PURE__ */ u$1(
          "button",
          {
            type: "button",
            class: "dm-popover-trigger " + (props.triggerClass || "dm-ghost-btn"),
            "aria-label": props.label,
            title: props.label,
            "aria-expanded": open,
            onClick: function(event) {
              event.stopPropagation();
              setOpen(!open);
            },
            children: props.trigger
          }
        ),
        open ? /* @__PURE__ */ u$1("div", { class: "dm-popover" + (props.align === "start" ? " is-start" : ""), children: props.children(close) }) : null
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
        /* @__PURE__ */ u$1("span", { class: "dm-drawer-eyebrow", children: props.eyebrow }),
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
const NAME_MAX_LENGTH = 40;
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
                    maxLength: NAME_MAX_LENGTH,
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
                  /* @__PURE__ */ u$1(IconButton, { icon: "trash-2", label: "删除", tone: "danger", onClick: function() {
                    props.onDelete(entry.id);
                  } })
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
  return /* @__PURE__ */ u$1("header", { class: "dm-header", children: [
    /* @__PURE__ */ u$1("div", { class: "dm-header-brand", children: [
      /* @__PURE__ */ u$1("img", { class: "dm-header-logo", src: getLogoUrl(), alt: "" }),
      /* @__PURE__ */ u$1("h1", { class: "dm-header-title", children: "数据管理" }),
      props.scope ? /* @__PURE__ */ u$1(M, { children: [
        /* @__PURE__ */ u$1("span", { class: "dm-header-divider", "aria-hidden": "true" }),
        /* @__PURE__ */ u$1("span", { class: "dm-site-chip", title: "当前站点：" + props.scope, children: [
          /* @__PURE__ */ u$1(Icon, { name: "globe" }),
          /* @__PURE__ */ u$1("span", { class: "dm-site-chip-text", children: props.scope })
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
          class: "dm-row" + (props.selectedId === entry.id ? " is-selected" : ""),
          onClick: function() {
            props.onSelect(entry.id);
          },
          onKeyDown: function(event) {
            if (event.key === "Enter" && event.target === event.currentTarget) props.onSelect(entry.id);
          },
          children: [
            /* @__PURE__ */ u$1("td", { class: "dm-cell-time", children: formatDisplayTime(entry.createdAt) }),
            props.columns.map(function(fieldKey) {
              return /* @__PURE__ */ u$1("td", { children: /* @__PURE__ */ u$1(FieldCell, { fieldKey, value: entry.profile[fieldKey], query: props.query, onCopy: props.onCopyField }) }, fieldKey);
            }),
            /* @__PURE__ */ u$1("td", { class: "dm-col-actions", children: /* @__PURE__ */ u$1("div", { class: "dm-row-actions", children: [
              /* @__PURE__ */ u$1(IconButton, { icon: "star", label: "收藏", onClick: function() {
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
        placeholder: "搜索姓名、手机号、身份证…",
        "aria-label": "搜索数据",
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
const VIEW_LABELS = {
  favorites: "常用数据",
  history: "生成记录"
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
function useRecords(scope) {
  const [records, setRecords] = d({ favorites: [], history: [], loaded: false });
  const reload = j(async function() {
    if (!scope) {
      setRecords({ favorites: [], history: [], loaded: true });
      return;
    }
    const [favorites, history] = await Promise.all([readFavoriteProfiles(scope), readGeneratedProfiles(scope)]);
    setRecords({ favorites, history, loaded: true });
  }, [scope]);
  const setFavorites = j(function(entries) {
    setRecords(function(current) {
      return { ...current, favorites: entries };
    });
  }, []);
  A(function() {
    void reload();
  }, [reload]);
  return { ...records, reload, setFavorites };
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
  const editorDirtyRef = T(false);
  const searchInputRef = T(null);
  const records = useRecords(scope);
  const { columns, setViewColumns } = useColumnPreferences();
  const { toast, showToast } = useToast();
  const { confirm, confirmDialog } = useConfirm();
  const visibleFavorites = records.favorites.filter(function(entry) {
    return matchesQuery(entry.profile, [getFavoriteTitle(entry), entry.note], query);
  });
  const visibleHistory = records.history.filter(function(entry) {
    return matchesQuery(entry.profile, [formatDisplayTime(entry.createdAt)], query);
  });
  const drawerFavoriteId = drawer && (drawer.mode === "edit" || drawer.mode === "view" && drawer.view === "favorites") ? drawer.id : null;
  const drawerFavorite = drawerFavoriteId ? records.favorites.find(function(entry) {
    return entry.id === drawerFavoriteId;
  }) || null : null;
  const drawerHistory = drawer && drawer.mode === "view" && drawer.view === "history" ? records.history.find(function(entry) {
    return entry.id === drawer.id;
  }) || null : null;
  A(function() {
    if (!window.history || typeof window.history.replaceState !== "function") return;
    window.history.replaceState(null, "", buildDataManagerPageUrl(window.location.href, scope, view));
  }, [scope, view]);
  A(function() {
    function handleKeydown(event) {
      if (event.defaultPrevented || confirmDialog) return;
      const target = event.target;
      const typing = !!target && (target.tagName === "INPUT" || target.tagName === "TEXTAREA" || target.isContentEditable);
      if (event.key === "/" && !typing && scope) {
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
  async function runSafely(task) {
    try {
      await task();
    } catch (_error) {
      showToast("操作失败，请重试", "danger");
    }
  }
  async function changeDrawer(next) {
    const editing = drawer && (drawer.mode === "edit" || drawer.mode === "create");
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
      if (drawer.mode === "edit") {
        await updateFavoriteProfile(scope, drawer.id, draft);
        showToast("常用数据已更新", "success");
        editorDirtyRef.current = false;
        setDrawer({ mode: "view", view: "favorites", id: drawer.id });
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
    const created = await createFavoriteFromHistory(scope, id);
    if (!created) return;
    await records.reload();
    showToast("已从生成记录加入常用数据", "success");
  }
  function openCreate() {
    void changeDrawer({ mode: "create" });
  }
  function renderNoMatch() {
    return /* @__PURE__ */ u$1(EmptyState, { icon: "search", title: "没有匹配的数据", description: "没有找到包含「" + query.trim() + "」的数据。", children: /* @__PURE__ */ u$1("button", { type: "button", class: "dm-secondary-btn", onClick: function() {
      setQuery("");
    }, children: "清空搜索" }) });
  }
  function renderDrawer() {
    if (!drawer) return null;
    if (drawer.mode === "create" || drawer.mode === "edit" && drawerFavorite) {
      return /* @__PURE__ */ u$1(
        FavoriteEditor,
        {
          entry: drawer.mode === "edit" ? drawerFavorite : null,
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
        drawer.mode === "edit" ? "edit-" + drawer.id : "create"
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
              void changeDrawer({ mode: "edit", id: entry.id });
            }, children: [
              /* @__PURE__ */ u$1(Icon, { name: "pencil" }),
              "编辑"
            ] }),
            /* @__PURE__ */ u$1("span", { class: "dm-drawer-foot-spacer" }),
            /* @__PURE__ */ u$1(
              "button",
              {
                type: "button",
                class: "dm-ghost-btn is-danger",
                onClick: function() {
                  void runSafely(function() {
                    return handleDelete(entry.id);
                  });
                },
                children: [
                  /* @__PURE__ */ u$1(Icon, { name: "trash-2" }),
                  "删除"
                ]
              }
            )
          ] }),
          children: /* @__PURE__ */ u$1(ProfileDetails, { profile: entry.profile, onCopyField: handleCopyField })
        }
      );
    }
    if (drawerHistory) {
      const entry = drawerHistory;
      return /* @__PURE__ */ u$1(
        DrawerShell,
        {
          eyebrow: "生成记录",
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
                  "收藏"
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
  function renderWorkspace() {
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
          void changeDrawer({ mode: "edit", id });
        },
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
    /* @__PURE__ */ u$1(Header, { scope, children: scope && view === "favorites" ? /* @__PURE__ */ u$1("button", { type: "button", class: "dm-primary-btn", onClick: openCreate, children: [
      /* @__PURE__ */ u$1(Icon, { name: "plus" }),
      "新增"
    ] }) : null }),
    scope ? /* @__PURE__ */ u$1(
      Toolbar,
      {
        view,
        counts: { favorites: records.favorites.length, history: records.history.length },
        hint: view === "history" ? "仅保留最近 " + MAX_GENERATED_RECORDS + " 条" : "",
        onViewChange: function(nextView) {
          if (nextView === view) return;
          void changeDrawer(null).then(function(changed) {
            if (!changed) return;
            setView(nextView);
            void records.reload();
          });
        },
        children: [
          /* @__PURE__ */ u$1(SearchBox, { inputRef: searchInputRef, value: query, onChange: setQuery }),
          /* @__PURE__ */ u$1(
            ColumnPicker,
            {
              columns: columns[view],
              defaultColumns: DEFAULT_COLUMNS[view],
              onChange: function(nextColumns) {
                setViewColumns(view, nextColumns);
              }
            }
          )
        ]
      }
    ) : null,
    /* @__PURE__ */ u$1("div", { class: "dm-body", children: [
      /* @__PURE__ */ u$1("section", { class: "dm-main", role: "tabpanel", "aria-label": VIEW_LABELS[view], children: renderWorkspace() }),
      renderDrawer()
    ] }),
    toast ? /* @__PURE__ */ u$1("div", { class: "dm-toast", role: "status", "data-tone": toast.tone, children: toast.message }, toast.id) : null,
    confirmDialog
  ] });
}
const mountNode = document.getElementById("app");
if (mountNode) G$1(/* @__PURE__ */ u$1(App, {}), mountNode);
