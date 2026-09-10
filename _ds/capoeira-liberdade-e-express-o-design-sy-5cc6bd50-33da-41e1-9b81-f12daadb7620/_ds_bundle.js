/* @ds-bundle: {"format":4,"namespace":"CapoeiraLiberdadeEExpressODesignSystem_5cc6bd","components":[{"name":"AcademyCard","sourcePath":"components/capoeira/AcademyCard.jsx"},{"name":"ChartBox","sourcePath":"components/capoeira/ChartBox.jsx"},{"name":"CordaoBar","sourcePath":"components/capoeira/CordaoBar.jsx"},{"name":"CriterionPill","sourcePath":"components/capoeira/CriterionPill.jsx"},{"name":"LessonCard","sourcePath":"components/capoeira/LessonCard.jsx"},{"name":"ProductCard","sourcePath":"components/capoeira/ProductCard.jsx"},{"name":"ProfileBanner","sourcePath":"components/capoeira/ProfileBanner.jsx"},{"name":"RuleBox","sourcePath":"components/capoeira/RuleBox.jsx"},{"name":"StarRating","sourcePath":"components/capoeira/StarRating.jsx"},{"name":"StudentCard","sourcePath":"components/capoeira/StudentCard.jsx"},{"name":"TeacherBox","sourcePath":"components/capoeira/TeacherBox.jsx"},{"name":"CORDOES_ADULTO","sourcePath":"components/capoeira/cordoes.js"},{"name":"CORDOES_KIDS","sourcePath":"components/capoeira/cordoes.js"},{"name":"CRITERIOS","sourcePath":"components/capoeira/cordoes.js"},{"name":"Badge","sourcePath":"components/core/Badge.jsx"},{"name":"Button","sourcePath":"components/core/Button.jsx"},{"name":"Card","sourcePath":"components/core/Card.jsx"},{"name":"IconButton","sourcePath":"components/core/IconButton.jsx"},{"name":"Input","sourcePath":"components/core/Input.jsx"},{"name":"Inset","sourcePath":"components/core/Inset.jsx"},{"name":"SectionHeader","sourcePath":"components/core/SectionHeader.jsx"},{"name":"Select","sourcePath":"components/core/Select.jsx"},{"name":"Alert","sourcePath":"components/feedback/Alert.jsx"},{"name":"EmptyState","sourcePath":"components/feedback/EmptyState.jsx"},{"name":"Modal","sourcePath":"components/feedback/Modal.jsx"},{"name":"SkeletonCard","sourcePath":"components/feedback/SkeletonCard.jsx"},{"name":"Toast","sourcePath":"components/feedback/Toast.jsx"},{"name":"NavItem","sourcePath":"components/navigation/NavItem.jsx"},{"name":"StepIndicator","sourcePath":"components/navigation/StepIndicator.jsx"},{"name":"TopNav","sourcePath":"components/navigation/TopNav.jsx"}],"sourceHashes":{"components/capoeira/AcademyCard.jsx":"3b57abdf8df6","components/capoeira/ChartBox.jsx":"b3d0b0ccd27f","components/capoeira/CordaoBar.jsx":"6be2a83129ad","components/capoeira/CriterionPill.jsx":"043bf674b044","components/capoeira/LessonCard.jsx":"2375b10ec06e","components/capoeira/ProductCard.jsx":"684358efd222","components/capoeira/ProfileBanner.jsx":"825d7105f3a3","components/capoeira/RuleBox.jsx":"9a43c77c93f2","components/capoeira/StarRating.jsx":"1b0809f24b91","components/capoeira/StudentCard.jsx":"61af00ed67be","components/capoeira/TeacherBox.jsx":"5549c76a17bb","components/capoeira/cordoes.js":"7eb2e3619a01","components/core/Badge.jsx":"24136894bbb3","components/core/Button.jsx":"3f4ba89386ac","components/core/Card.jsx":"8803641ea9e4","components/core/IconButton.jsx":"1e8e1ccc3097","components/core/Input.jsx":"39483cff7c71","components/core/Inset.jsx":"4083198714c8","components/core/SectionHeader.jsx":"58cc39145e2e","components/core/Select.jsx":"ce18c48a6f48","components/feedback/Alert.jsx":"eeb5cd616c68","components/feedback/EmptyState.jsx":"ee03baaed33e","components/feedback/Modal.jsx":"daf172df4795","components/feedback/SkeletonCard.jsx":"3a199725000c","components/feedback/Toast.jsx":"853659cf48d0","components/navigation/NavItem.jsx":"5cfadd7c7542","components/navigation/StepIndicator.jsx":"39ee276ade24","components/navigation/TopNav.jsx":"b3ced39f7faf","ui_kits/inscricao/app.jsx":"740a38069461","ui_kits/inscricao/steps.jsx":"8e5244d39c11","ui_kits/painel-admin/AcademiasTab.jsx":"2640c6d6861c","ui_kits/painel-admin/AlunosTab.jsx":"59d1b497ee12","ui_kits/painel-admin/ProntuarioModal.jsx":"9688c1056a23","ui_kits/painel-admin/app.jsx":"63c29684069d","ui_kits/painel-admin/data.jsx":"91753ae750be","ui_kits/portal-aluno/AulasTab.jsx":"a093b48d5d58","ui_kits/portal-aluno/EvolucaoTab.jsx":"c54878e0d2c6","ui_kits/portal-aluno/FinanceiroTab.jsx":"4df11019d881","ui_kits/portal-aluno/LoginScreen.jsx":"bba2d6fb470d","ui_kits/portal-aluno/StudentPanel.jsx":"efd5ebdd5eda","ui_kits/portal-aluno/app.jsx":"6610d5a53072"},"inlinedExternals":[],"unexposedExports":[]} */

(() => {

const __ds_ns = (window.CapoeiraLiberdadeEExpressODesignSystem_5cc6bd = window.CapoeiraLiberdadeEExpressODesignSystem_5cc6bd || {});

const __ds_scope = {};

(__ds_ns.__errors = __ds_ns.__errors || []);

// components/capoeira/ChartBox.jsx
try { (() => {
function ChartBox({
  title,
  height = 300,
  fullWidth,
  children
}) {
  return /*#__PURE__*/React.createElement("div", {
    className: "le-card",
    style: {
      borderRadius: 'var(--radius-3xl)',
      boxShadow: '0 5px 20px rgba(0,0,0,0.05)',
      display: 'flex',
      flexDirection: 'column',
      gridColumn: fullWidth ? '1 / -1' : undefined
    }
  }, /*#__PURE__*/React.createElement("h3", {
    style: {
      color: 'var(--blue-900)',
      marginBottom: 15,
      textAlign: 'center',
      fontSize: '1rem'
    }
  }, title), /*#__PURE__*/React.createElement("div", {
    style: {
      height,
      width: '100%',
      position: 'relative',
      flex: 1
    }
  }, children));
}
Object.assign(__ds_scope, { ChartBox });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/capoeira/ChartBox.jsx", error: String((e && e.message) || e) }); }

// components/capoeira/CordaoBar.jsx
try { (() => {
function CordaoBar({
  percent = 0,
  colors = ['#CCC', '#CCC', '#CCC'],
  size = 'lg'
}) {
  const glow = percent >= 70 ? '0 0 15px rgba(0, 230, 118, 0.7)' : 'none';
  return /*#__PURE__*/React.createElement("div", {
    className: 'le-cordao-track' + (size === 'sm' ? ' le-cordao-track--sm' : '')
  }, /*#__PURE__*/React.createElement("div", {
    className: "le-cordao-fill",
    style: {
      width: percent + '%',
      boxShadow: glow,
      '--c1': colors[0],
      '--c2': colors[1],
      '--c3': colors[2]
    }
  }));
}
Object.assign(__ds_scope, { CordaoBar });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/capoeira/CordaoBar.jsx", error: String((e && e.message) || e) }); }

// components/capoeira/CriterionPill.jsx
try { (() => {
function CriterionPill({
  name,
  score = 0,
  max = 10,
  style
}) {
  return /*#__PURE__*/React.createElement("div", {
    className: "le-criterio",
    style: style
  }, /*#__PURE__*/React.createElement("span", {
    className: "le-criterio__nome"
  }, name), /*#__PURE__*/React.createElement("span", {
    className: "le-criterio__nota"
  }, score, "/", max));
}
Object.assign(__ds_scope, { CriterionPill });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/capoeira/CriterionPill.jsx", error: String((e && e.message) || e) }); }

// components/capoeira/LessonCard.jsx
try { (() => {
function LessonCard({
  embedUrl,
  thumbnail,
  title,
  description,
  href = '#'
}) {
  return /*#__PURE__*/React.createElement("div", {
    className: "le-card",
    style: {
      borderRadius: 'var(--radius-4xl)',
      padding: 0,
      overflow: 'hidden',
      boxShadow: '0 6px 20px rgba(0,0,0,0.03)',
      display: 'flex',
      flexDirection: 'column'
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      position: 'relative',
      width: '100%',
      height: 190,
      background: '#000'
    }
  }, embedUrl ? /*#__PURE__*/React.createElement("iframe", {
    src: embedUrl,
    title: title,
    allowFullScreen: true,
    loading: "lazy",
    style: {
      width: '100%',
      height: '100%',
      border: 'none'
    }
  }) : /*#__PURE__*/React.createElement("img", {
    src: thumbnail,
    alt: "",
    style: {
      width: '100%',
      height: '100%',
      objectFit: 'cover'
    }
  })), /*#__PURE__*/React.createElement("div", {
    style: {
      padding: 20,
      flex: 1,
      display: 'flex',
      flexDirection: 'column',
      justifyContent: 'space-between'
    }
  }, /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("h3", {
    style: {
      color: 'var(--blue-900)',
      fontSize: '1.1rem',
      marginBottom: 8
    }
  }, title), /*#__PURE__*/React.createElement("p", {
    style: {
      color: 'var(--ink-500)',
      fontSize: '0.9rem',
      marginBottom: 15
    }
  }, description)), /*#__PURE__*/React.createElement("a", {
    href: href,
    className: "le-btn le-btn--primary le-btn--block",
    style: {
      borderRadius: 10,
      textDecoration: 'none'
    }
  }, /*#__PURE__*/React.createElement("i", {
    className: "fas fa-play"
  }), " Assistir Aula Completa")));
}
Object.assign(__ds_scope, { LessonCard });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/capoeira/LessonCard.jsx", error: String((e && e.message) || e) }); }

// components/capoeira/ProfileBanner.jsx
try { (() => {
function ProfileBanner({
  photo,
  name,
  academy,
  cordao
}) {
  return /*#__PURE__*/React.createElement("div", {
    className: "le-banner"
  }, /*#__PURE__*/React.createElement("img", {
    className: "le-avatar",
    src: photo,
    alt: "",
    style: {
      width: 110,
      height: 110,
      border: '4px solid #fff',
      boxShadow: '0 8px 20px rgba(0,0,0,0.3)',
      flexShrink: 0
    }
  }), /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("h1", {
    style: {
      fontSize: '2rem',
      marginBottom: 8,
      letterSpacing: '0.5px'
    }
  }, name), /*#__PURE__*/React.createElement("p", {
    style: {
      opacity: 0.95,
      fontSize: '1.05rem',
      display: 'flex',
      alignItems: 'center',
      gap: 8,
      flexWrap: 'wrap'
    }
  }, /*#__PURE__*/React.createElement("i", {
    className: "fas fa-map-marker-alt"
  }), " Academia: ", /*#__PURE__*/React.createElement("strong", null, academy), " \xA0|\xA0", /*#__PURE__*/React.createElement("i", {
    className: "fas fa-award"
  }), " Gradua\xE7\xE3o Atual: ", /*#__PURE__*/React.createElement("strong", null, cordao))));
}
Object.assign(__ds_scope, { ProfileBanner });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/capoeira/ProfileBanner.jsx", error: String((e && e.message) || e) }); }

// components/capoeira/RuleBox.jsx
try { (() => {
function RuleBox({
  title,
  warning,
  children
}) {
  return /*#__PURE__*/React.createElement("div", {
    className: "le-rule-box"
  }, title ? /*#__PURE__*/React.createElement("h3", {
    style: {
      color: 'var(--action-secondary)',
      marginBottom: 10,
      fontSize: '1.1rem'
    }
  }, title) : null, children, warning ? /*#__PURE__*/React.createElement("p", {
    className: "le-warning"
  }, warning) : null);
}
Object.assign(__ds_scope, { RuleBox });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/capoeira/RuleBox.jsx", error: String((e && e.message) || e) }); }

// components/capoeira/StarRating.jsx
try { (() => {
function StarRating({
  value = 0,
  max = 5,
  onChange
}) {
  return /*#__PURE__*/React.createElement("div", {
    className: "le-stars"
  }, Array.from({
    length: max
  }, (_, i) => /*#__PURE__*/React.createElement("i", {
    key: i,
    className: 'fas fa-star' + (i < value ? ' is-on' : ''),
    onClick: onChange ? () => onChange(i + 1) : undefined
  })));
}
Object.assign(__ds_scope, { StarRating });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/capoeira/StarRating.jsx", error: String((e && e.message) || e) }); }

// components/capoeira/TeacherBox.jsx
try { (() => {
function TeacherBox({
  photo,
  name,
  title,
  bio
}) {
  return /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      gap: 25,
      alignItems: 'center',
      background: 'linear-gradient(135deg,#f8fbfb,#eaf2f1)',
      padding: 25,
      borderRadius: 16,
      border: '1px solid var(--border-card)'
    }
  }, /*#__PURE__*/React.createElement("img", {
    className: "le-avatar",
    src: photo,
    alt: "",
    style: {
      width: 90,
      height: 90,
      border: '3px solid var(--action-primary)',
      flexShrink: 0,
      boxShadow: '0 5px 15px rgba(0,0,0,0.1)'
    }
  }), /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("h3", {
    style: {
      color: 'var(--blue-900)',
      fontSize: '1.2rem',
      marginBottom: 5
    }
  }, name), /*#__PURE__*/React.createElement("h4", {
    style: {
      color: 'var(--action-primary)',
      fontSize: '0.95rem',
      marginBottom: 10,
      fontWeight: 700
    }
  }, title), /*#__PURE__*/React.createElement("p", {
    style: {
      color: 'var(--ink-600)',
      fontSize: '0.9rem',
      lineHeight: 1.5
    }
  }, bio)));
}
Object.assign(__ds_scope, { TeacherBox });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/capoeira/TeacherBox.jsx", error: String((e && e.message) || e) }); }

// components/capoeira/cordoes.js
try { (() => {
// Cordão (belt) sequences, verbatim from aluno.html.
const CORDOES_ADULTO = [{
  nome: 'Iniciante',
  cor: ['#CCC', '#CCC', '#CCC']
}, {
  nome: 'Escravo',
  cor: ['#4F4F4F', '#4F4F4F', '#4F4F4F']
}, {
  nome: 'Fugitivo',
  cor: ['#4F4F4F', '#F5DEB3', '#4F4F4F']
}, {
  nome: 'Quilombola',
  cor: ['#DAA520', '#DAA520', '#DAA520']
}, {
  nome: 'Vagante',
  cor: ['#D2691E', '#D32F2F', '#D2691E']
}, {
  nome: 'Liberto',
  cor: ['#D32F2F', '#D32F2F', '#D32F2F']
}, {
  nome: 'Instrutor',
  cor: ['#4F4F4F', '#F5DEB3', '#D32F2F']
}, {
  nome: 'Professor',
  cor: ['#D32F2F', '#FFFFFF', '#D32F2F']
}, {
  nome: 'Mestre',
  cor: ['#F5F5F5', '#F5F5F5', '#F5F5F5']
}];
const CORDOES_KIDS = [{
  nome: 'Iniciante',
  cor: ['#CCC', '#CCC', '#CCC']
}, {
  nome: 'Cinza Claro',
  cor: ['#D3D3D3', '#D3D3D3', '#D3D3D3']
}, {
  nome: 'Cinza e Bege',
  cor: ['#D3D3D3', '#F5DEB3', '#D3D3D3']
}, {
  nome: 'Bege',
  cor: ['#F5DEB3', '#F5DEB3', '#F5DEB3']
}];
const CRITERIOS = ['Ginga e Base', 'Acrobacias', 'Respeito', 'Disciplina', 'Pontualidade', 'Freq. Aulas', 'Freq. Rodas', 'Eventos', 'Pandeiro', 'Atabaque', 'Berimbau', 'Canta/Responde', 'Higiene', 'Aprendizado', 'Fundamentos'];
Object.assign(__ds_scope, { CORDOES_ADULTO, CORDOES_KIDS, CRITERIOS });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/capoeira/cordoes.js", error: String((e && e.message) || e) }); }

// components/core/Badge.jsx
try { (() => {
function Badge({
  tone = 'teal',
  icon,
  children
}) {
  return /*#__PURE__*/React.createElement("span", {
    className: 'le-badge' + (tone === 'teal' ? '' : ' le-badge--' + tone)
  }, icon ? /*#__PURE__*/React.createElement("i", {
    className: icon
  }) : null, children);
}
Object.assign(__ds_scope, { Badge });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/core/Badge.jsx", error: String((e && e.message) || e) }); }

// components/core/Button.jsx
try { (() => {
function _extends() { return _extends = Object.assign ? Object.assign.bind() : function (n) { for (var e = 1; e < arguments.length; e++) { var t = arguments[e]; for (var r in t) ({}).hasOwnProperty.call(t, r) && (n[r] = t[r]); } return n; }, _extends.apply(null, arguments); }
function Button({
  variant = 'primary',
  size = 'md',
  shape = 'default',
  icon,
  iconRight,
  block,
  children,
  ...rest
}) {
  const cls = ['le-btn', 'le-btn--' + variant];
  if (size !== 'md') cls.push('le-btn--' + size);
  if (shape !== 'default') cls.push('le-btn--' + shape);
  if (block) cls.push('le-btn--block');
  return /*#__PURE__*/React.createElement("button", _extends({
    className: cls.join(' ')
  }, rest), icon ? /*#__PURE__*/React.createElement("i", {
    className: icon
  }) : null, children, iconRight ? /*#__PURE__*/React.createElement("i", {
    className: iconRight
  }) : null);
}
Object.assign(__ds_scope, { Button });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/core/Button.jsx", error: String((e && e.message) || e) }); }

// components/capoeira/AcademyCard.jsx
try { (() => {
function AcademyCard({
  name,
  teacher,
  login,
  index = 0,
  onEdit,
  onDelete
}) {
  return /*#__PURE__*/React.createElement("div", {
    className: "le-card",
    style: {
      borderRadius: 'var(--radius-xl)',
      boxShadow: '0 4px 10px rgba(0,0,0,0.02)',
      animation: 'le-card-in 0.4s var(--ease-standard) both',
      animationDelay: index * 60 + 'ms'
    }
  }, /*#__PURE__*/React.createElement("h4", {
    style: {
      color: 'var(--blue-900)',
      fontSize: '1.1rem',
      marginBottom: 5
    }
  }, name), /*#__PURE__*/React.createElement("p", {
    style: {
      fontSize: '0.9rem',
      color: 'var(--ink-500)',
      marginBottom: 5
    }
  }, teacher), /*#__PURE__*/React.createElement("p", {
    style: {
      fontSize: '0.9rem',
      color: 'var(--ink-500)'
    }
  }, login), /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      gap: 10,
      marginTop: 15,
      borderTop: '1px solid var(--line-soft)',
      paddingTop: 10
    }
  }, /*#__PURE__*/React.createElement(__ds_scope.Button, {
    variant: "warn",
    size: "sm",
    block: true,
    onClick: onEdit
  }, "Editar"), /*#__PURE__*/React.createElement(__ds_scope.Button, {
    variant: "danger",
    size: "sm",
    block: true,
    onClick: onDelete
  }, "Excluir")));
}
Object.assign(__ds_scope, { AcademyCard });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/capoeira/AcademyCard.jsx", error: String((e && e.message) || e) }); }

// components/capoeira/ProductCard.jsx
try { (() => {
function ProductCard({
  image,
  name,
  description,
  price,
  onBuy
}) {
  return /*#__PURE__*/React.createElement("div", {
    className: "le-card le-card--interactive",
    style: {
      borderRadius: 'var(--radius-4xl)',
      boxShadow: '0 6px 20px rgba(0,0,0,0.03)',
      display: 'flex',
      flexDirection: 'column',
      justifyContent: 'space-between',
      textAlign: 'center'
    }
  }, /*#__PURE__*/React.createElement("img", {
    src: image,
    alt: "",
    style: {
      width: '100%',
      height: 160,
      objectFit: 'cover',
      borderRadius: 12,
      marginBottom: 15
    }
  }), /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("h3", {
    style: {
      color: 'var(--blue-900)',
      fontSize: '1.1rem',
      marginBottom: 8
    }
  }, name), /*#__PURE__*/React.createElement("p", {
    style: {
      color: 'var(--ink-500)',
      fontSize: '0.85rem',
      marginBottom: 15,
      lineHeight: 1.4
    }
  }, description), /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: '1.25rem',
      fontWeight: 800,
      color: 'var(--action-primary)',
      marginBottom: 15
    }
  }, price)), /*#__PURE__*/React.createElement(__ds_scope.Button, {
    variant: "buy",
    icon: "fas fa-cart-plus",
    block: true,
    onClick: onBuy
  }, "Comprar Agora"));
}
Object.assign(__ds_scope, { ProductCard });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/capoeira/ProductCard.jsx", error: String((e && e.message) || e) }); }

// components/capoeira/StudentCard.jsx
try { (() => {
function StudentCard({
  photo,
  name,
  academy,
  cordao,
  age,
  index = 0,
  academies = [],
  onDetails
}) {
  return /*#__PURE__*/React.createElement("div", {
    className: "le-card le-card--shadow le-card--interactive le-card--hover",
    style: {
      display: 'flex',
      flexDirection: 'column',
      gap: 15,
      animation: 'le-card-in 0.45s var(--ease-standard) both',
      animationDelay: index * 45 + 'ms'
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      gap: 15,
      alignItems: 'center'
    }
  }, /*#__PURE__*/React.createElement("img", {
    className: "le-avatar",
    src: photo,
    alt: "",
    style: {
      width: 70,
      height: 70
    }
  }), /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("h3", {
    style: {
      fontSize: '1.1rem',
      marginBottom: 4,
      wordBreak: 'break-word'
    }
  }, name), /*#__PURE__*/React.createElement("p", {
    style: {
      fontSize: '0.85rem',
      color: 'var(--text-muted)'
    }
  }, academy), /*#__PURE__*/React.createElement("p", {
    style: {
      fontSize: '0.85rem',
      color: 'var(--text-muted)'
    }
  }, cordao, age ? ' · ' + age + ' anos' : ''))), /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'center',
      borderTop: '1px solid var(--border-card)',
      paddingTop: 15,
      gap: 10,
      flexWrap: 'wrap'
    }
  }, /*#__PURE__*/React.createElement("select", {
    className: "le-input",
    style: {
      width: 'auto',
      fontSize: '0.85rem',
      padding: 8,
      borderRadius: 6
    },
    defaultValue: ""
  }, /*#__PURE__*/React.createElement("option", {
    value: ""
  }, "Encaminhar para..."), academies.map(a => /*#__PURE__*/React.createElement("option", {
    key: a,
    value: a
  }, a))), /*#__PURE__*/React.createElement(__ds_scope.Button, {
    size: "sm",
    onClick: onDetails
  }, "Detalhes")));
}
Object.assign(__ds_scope, { StudentCard });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/capoeira/StudentCard.jsx", error: String((e && e.message) || e) }); }

// components/core/Card.jsx
try { (() => {
function _extends() { return _extends = Object.assign ? Object.assign.bind() : function (n) { for (var e = 1; e < arguments.length; e++) { var t = arguments[e]; for (var r in t) ({}).hasOwnProperty.call(t, r) && (n[r] = t[r]); } return n; }, _extends.apply(null, arguments); }
function Card({
  variant = 'default',
  hover,
  style,
  className = '',
  children,
  ...rest
}) {
  const cls = ['le-card'];
  if (variant === 'panel') cls.push('le-card--panel');
  if (variant === 'shadow') cls.push('le-card--shadow');
  if (hover) cls.push('le-card--interactive', 'le-card--hover');
  return /*#__PURE__*/React.createElement("div", _extends({
    className: cls.concat(className).join(' '),
    style: style
  }, rest), children);
}
Object.assign(__ds_scope, { Card });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/core/Card.jsx", error: String((e && e.message) || e) }); }

// components/core/IconButton.jsx
try { (() => {
function _extends() { return _extends = Object.assign ? Object.assign.bind() : function (n) { for (var e = 1; e < arguments.length; e++) { var t = arguments[e]; for (var r in t) ({}).hasOwnProperty.call(t, r) && (n[r] = t[r]); } return n; }, _extends.apply(null, arguments); }
function IconButton({
  variant = 'danger',
  icon = 'fas fa-times',
  label,
  ...rest
}) {
  return /*#__PURE__*/React.createElement("button", _extends({
    className: 'le-icon-btn le-icon-btn--' + variant,
    "aria-label": label,
    title: label
  }, rest), /*#__PURE__*/React.createElement("i", {
    className: icon
  }));
}
Object.assign(__ds_scope, { IconButton });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/core/IconButton.jsx", error: String((e && e.message) || e) }); }

// components/core/Input.jsx
try { (() => {
function _extends() { return _extends = Object.assign ? Object.assign.bind() : function (n) { for (var e = 1; e < arguments.length; e++) { var t = arguments[e]; for (var r in t) ({}).hasOwnProperty.call(t, r) && (n[r] = t[r]); } return n; }, _extends.apply(null, arguments); }
function Input({
  label,
  id,
  size = 'md',
  icon,
  ...rest
}) {
  const field = /*#__PURE__*/React.createElement("input", _extends({
    id: id,
    className: 'le-input' + (size === 'lg' ? ' le-input--lg' : '')
  }, rest));
  const body = icon ? /*#__PURE__*/React.createElement("div", {
    className: "le-input-icon"
  }, /*#__PURE__*/React.createElement("i", {
    className: icon
  }), field) : field;
  if (!label) return body;
  return /*#__PURE__*/React.createElement("div", {
    className: "le-field"
  }, /*#__PURE__*/React.createElement("label", {
    className: "le-field__label",
    htmlFor: id
  }, label), body);
}
Object.assign(__ds_scope, { Input });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/core/Input.jsx", error: String((e && e.message) || e) }); }

// components/core/Inset.jsx
try { (() => {
function _extends() { return _extends = Object.assign ? Object.assign.bind() : function (n) { for (var e = 1; e < arguments.length; e++) { var t = arguments[e]; for (var r in t) ({}).hasOwnProperty.call(t, r) && (n[r] = t[r]); } return n; }, _extends.apply(null, arguments); }
function Inset({
  style,
  children,
  ...rest
}) {
  return /*#__PURE__*/React.createElement("div", _extends({
    className: "le-inset",
    style: style
  }, rest), children);
}
Object.assign(__ds_scope, { Inset });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/core/Inset.jsx", error: String((e && e.message) || e) }); }

// components/core/SectionHeader.jsx
try { (() => {
function SectionHeader({
  tone = 'teal',
  icon,
  children
}) {
  return /*#__PURE__*/React.createElement("div", {
    className: 'le-section-header' + (tone === 'blue' ? ' le-section-header--blue' : '')
  }, /*#__PURE__*/React.createElement("h2", null, icon ? /*#__PURE__*/React.createElement("i", {
    className: icon,
    style: {
      marginRight: 8
    }
  }) : null, children));
}
Object.assign(__ds_scope, { SectionHeader });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/core/SectionHeader.jsx", error: String((e && e.message) || e) }); }

// components/core/Select.jsx
try { (() => {
function _extends() { return _extends = Object.assign ? Object.assign.bind() : function (n) { for (var e = 1; e < arguments.length; e++) { var t = arguments[e]; for (var r in t) ({}).hasOwnProperty.call(t, r) && (n[r] = t[r]); } return n; }, _extends.apply(null, arguments); }
function Select({
  label,
  id,
  size = 'md',
  options = [],
  children,
  ...rest
}) {
  const field = /*#__PURE__*/React.createElement("select", _extends({
    id: id,
    className: 'le-input' + (size === 'lg' ? ' le-input--lg' : '')
  }, rest), children || options.map(o => typeof o === 'string' ? /*#__PURE__*/React.createElement("option", {
    key: o,
    value: o
  }, o) : /*#__PURE__*/React.createElement("option", {
    key: o.value,
    value: o.value
  }, o.label)));
  if (!label) return field;
  return /*#__PURE__*/React.createElement("div", {
    className: "le-field"
  }, /*#__PURE__*/React.createElement("label", {
    className: "le-field__label",
    htmlFor: id
  }, label), field);
}
Object.assign(__ds_scope, { Select });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/core/Select.jsx", error: String((e && e.message) || e) }); }

// components/feedback/Alert.jsx
try { (() => {
function Alert({
  icon = 'fas fa-exclamation-circle',
  children
}) {
  return /*#__PURE__*/React.createElement("div", {
    className: "le-alert",
    role: "alert"
  }, /*#__PURE__*/React.createElement("i", {
    className: icon
  }), " ", children);
}
Object.assign(__ds_scope, { Alert });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/feedback/Alert.jsx", error: String((e && e.message) || e) }); }

// components/feedback/EmptyState.jsx
try { (() => {
function EmptyState({
  icon = 'fas fa-inbox',
  children
}) {
  return /*#__PURE__*/React.createElement("div", {
    className: "le-empty"
  }, /*#__PURE__*/React.createElement("i", {
    className: icon
  }), children);
}
Object.assign(__ds_scope, { EmptyState });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/feedback/EmptyState.jsx", error: String((e && e.message) || e) }); }

// components/feedback/Modal.jsx
try { (() => {
function Modal({
  open = true,
  size = 'md',
  onClose,
  children
}) {
  if (!open) return null;
  return /*#__PURE__*/React.createElement("div", {
    className: "le-modal-overlay",
    role: "dialog",
    "aria-modal": "true"
  }, /*#__PURE__*/React.createElement("div", {
    className: "le-modal",
    style: {
      maxWidth: size === 'lg' ? 950 : 500
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      position: 'absolute',
      top: 20,
      right: 20
    }
  }, /*#__PURE__*/React.createElement(__ds_scope.IconButton, {
    variant: "ghost",
    icon: "fas fa-times",
    label: "Fechar",
    onClick: onClose
  })), children));
}
Object.assign(__ds_scope, { Modal });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/feedback/Modal.jsx", error: String((e && e.message) || e) }); }

// components/feedback/SkeletonCard.jsx
try { (() => {
function SkeletonCard() {
  return /*#__PURE__*/React.createElement("div", {
    className: "le-card",
    style: {
      display: 'flex',
      flexDirection: 'column',
      gap: 15
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      gap: 15,
      alignItems: 'center'
    }
  }, /*#__PURE__*/React.createElement("div", {
    className: "le-skeleton-avatar"
  }), /*#__PURE__*/React.createElement("div", {
    style: {
      flex: 1
    }
  }, /*#__PURE__*/React.createElement("div", {
    className: "le-skeleton-line",
    style: {
      width: '60%'
    }
  }), /*#__PURE__*/React.createElement("div", {
    className: "le-skeleton-line",
    style: {
      width: '40%'
    }
  }))), /*#__PURE__*/React.createElement("div", {
    className: "le-skeleton-line",
    style: {
      width: '80%'
    }
  }));
}
Object.assign(__ds_scope, { SkeletonCard });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/feedback/SkeletonCard.jsx", error: String((e && e.message) || e) }); }

// components/feedback/Toast.jsx
try { (() => {
function Toast({
  tone = 'info',
  children
}) {
  return /*#__PURE__*/React.createElement("div", {
    className: 'le-toast' + (tone === 'info' ? '' : ' le-toast--' + tone)
  }, children);
}
Object.assign(__ds_scope, { Toast });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/feedback/Toast.jsx", error: String((e && e.message) || e) }); }

// components/navigation/NavItem.jsx
try { (() => {
function _extends() { return _extends = Object.assign ? Object.assign.bind() : function (n) { for (var e = 1; e < arguments.length; e++) { var t = arguments[e]; for (var r in t) ({}).hasOwnProperty.call(t, r) && (n[r] = t[r]); } return n; }, _extends.apply(null, arguments); }
function NavItem({
  variant = 'pill',
  active,
  icon,
  children,
  ...rest
}) {
  return /*#__PURE__*/React.createElement("button", _extends({
    className: 'le-nav-item le-nav-item--' + variant + (active ? ' is-active' : '')
  }, rest), icon ? /*#__PURE__*/React.createElement("i", {
    className: icon
  }) : null, children);
}
Object.assign(__ds_scope, { NavItem });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/navigation/NavItem.jsx", error: String((e && e.message) || e) }); }

// components/navigation/StepIndicator.jsx
try { (() => {
function StepIndicator({
  steps = 4,
  current = 1
}) {
  return /*#__PURE__*/React.createElement("div", {
    className: "le-steps",
    role: "progressbar",
    "aria-valuemin": 1,
    "aria-valuemax": steps,
    "aria-valuenow": current
  }, Array.from({
    length: steps
  }, (_, i) => /*#__PURE__*/React.createElement("div", {
    key: i,
    className: 'le-step' + (i + 1 === current ? ' is-active' : '')
  }, i + 1)));
}
Object.assign(__ds_scope, { StepIndicator });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/navigation/StepIndicator.jsx", error: String((e && e.message) || e) }); }

// components/navigation/TopNav.jsx
try { (() => {
function TopNav({
  logoSrc,
  title,
  children,
  right,
  style
}) {
  return /*#__PURE__*/React.createElement("header", {
    className: "le-topnav",
    style: style
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      alignItems: 'center',
      gap: 12
    }
  }, logoSrc ? /*#__PURE__*/React.createElement("img", {
    src: logoSrc,
    alt: "Capoeira Liberdade e Express\xE3o",
    className: "le-nav-logo"
  }) : null, title ? /*#__PURE__*/React.createElement("span", {
    style: {
      fontWeight: 800,
      color: 'var(--blue-900)',
      fontFamily: 'var(--font-display)',
      fontSize: '1.1rem'
    }
  }, title) : null), /*#__PURE__*/React.createElement("nav", {
    className: "le-nav-links"
  }, children), /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      alignItems: 'center',
      gap: 15
    }
  }, right));
}
Object.assign(__ds_scope, { TopNav });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/navigation/TopNav.jsx", error: String((e && e.message) || e) }); }

// ui_kits/inscricao/app.jsx
try { (() => {
const {
  StepIndicator,
  Button,
  Toast
} = window.CapoeiraLiberdadeEExpressODesignSystem_5cc6bd;
function InscricaoApp() {
  const [passo, setPasso] = React.useState(1);
  const [menor, setMenor] = React.useState(false);
  const [enviado, setEnviado] = React.useState(false);
  return /*#__PURE__*/React.createElement(React.Fragment, null, /*#__PURE__*/React.createElement("div", {
    style: {
      background: 'var(--brand-gradient-dark)',
      color: '#fff',
      padding: '30px 20px',
      textAlign: 'center',
      fontFamily: 'var(--font-display)',
      borderBottom: '4px solid var(--green-400)'
    }
  }, /*#__PURE__*/React.createElement("img", {
    src: "../../assets/logo-liberdade150.png",
    alt: "",
    style: {
      width: 130,
      height: 130,
      borderRadius: '50%',
      objectFit: 'cover',
      border: '3px solid var(--green-400)',
      boxShadow: '0 5px 15px rgba(0,0,0,0.6)',
      marginBottom: 15,
      background: '#fff'
    }
  }), /*#__PURE__*/React.createElement("h1", {
    style: {
      fontSize: '1.8rem'
    }
  }, "Ficha de Inscri\xE7\xE3o Oficial"), /*#__PURE__*/React.createElement("p", {
    style: {
      fontFamily: 'var(--font-body)',
      marginTop: 6
    }
  }, "Grupo de Capoeira Liberdade e Express\xE3o")), /*#__PURE__*/React.createElement("div", {
    style: {
      maxWidth: 800,
      margin: '-20px auto 30px',
      background: '#fff',
      padding: 30,
      borderRadius: 15,
      boxShadow: 'var(--shadow-raised)',
      position: 'relative',
      zIndex: 2
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      marginBottom: 30
    }
  }, /*#__PURE__*/React.createElement(StepIndicator, {
    steps: 4,
    current: passo
  })), passo === 1 && /*#__PURE__*/React.createElement(Step1, {
    menor: menor,
    setMenor: setMenor
  }), passo === 2 && /*#__PURE__*/React.createElement(Step2, null), passo === 3 && /*#__PURE__*/React.createElement(Step3, null), passo === 4 && /*#__PURE__*/React.createElement(Step4, null), /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      justifyContent: 'space-between',
      marginTop: 30,
      borderTop: '1px solid var(--line-soft)',
      paddingTop: 20
    }
  }, passo > 1 ? /*#__PURE__*/React.createElement(Button, {
    variant: "neutral",
    size: "lg",
    icon: "fas fa-arrow-left",
    onClick: () => setPasso(p => p - 1)
  }, "Voltar") : /*#__PURE__*/React.createElement("span", null), passo < 4 ? /*#__PURE__*/React.createElement(Button, {
    variant: "blue",
    size: "lg",
    iconRight: "fas fa-arrow-right",
    onClick: () => setPasso(p => p + 1)
  }, "Pr\xF3ximo") : /*#__PURE__*/React.createElement(Button, {
    variant: "confirm",
    size: "lg",
    icon: "fas fa-check-circle",
    onClick: () => setEnviado(true)
  }, "Enviar e Gerar PDF"))), /*#__PURE__*/React.createElement("div", {
    style: {
      position: 'fixed',
      bottom: 20,
      right: 20,
      zIndex: 1200
    }
  }, enviado && /*#__PURE__*/React.createElement(Toast, {
    tone: "success"
  }, "Inscri\xE7\xE3o enviada! Gerando a ficha em PDF\u2026")));
}
ReactDOM.createRoot(document.getElementById('root')).render(/*#__PURE__*/React.createElement(InscricaoApp, null));
})(); } catch (e) { __ds_ns.__errors.push({ path: "ui_kits/inscricao/app.jsx", error: String((e && e.message) || e) }); }

// ui_kits/inscricao/steps.jsx
try { (() => {
const {
  Input,
  Select,
  RuleBox,
  Button
} = window.CapoeiraLiberdadeEExpressODesignSystem_5cc6bd;
const PROFESSORES = ['Mestre Profeta', 'Professora Taynara', 'Mestre Abraão', 'Mestre Omar', 'Mestre Carlinhos', 'Professor Maick', 'Professor Tigoy', 'Professor Rafinha', 'Instrutor Leiliano', 'Professor Lebrinha'];
function H2({
  icon,
  children
}) {
  return /*#__PURE__*/React.createElement("h2", {
    style: {
      color: 'var(--blue-900)',
      marginBottom: 20,
      borderBottom: '2px solid var(--green-400)',
      paddingBottom: 10,
      fontSize: '1.4rem'
    }
  }, icon ? /*#__PURE__*/React.createElement("i", {
    className: icon
  }) : null, " ", children);
}
function Step1({
  menor,
  setMenor
}) {
  return /*#__PURE__*/React.createElement("div", {
    style: {
      animation: 'le-fade-in 0.4s var(--ease-standard)'
    }
  }, /*#__PURE__*/React.createElement(H2, {
    icon: "fas fa-camera"
  }, "Foto do Aluno"), /*#__PURE__*/React.createElement("div", {
    style: {
      textAlign: 'center',
      marginBottom: 30,
      background: '#f0f4f8',
      padding: 20,
      borderRadius: 12,
      border: '1px dashed var(--blue-600)'
    }
  }, /*#__PURE__*/React.createElement("p", {
    style: {
      marginBottom: 10
    }
  }, "Tire uma foto para o seu perfil e carteirinha."), /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      gap: 10,
      justifyContent: 'center'
    }
  }, /*#__PURE__*/React.createElement(Button, {
    variant: "blue",
    shape: "round",
    icon: "fas fa-video"
  }, "Iniciar C\xE2mera"), /*#__PURE__*/React.createElement(Button, {
    variant: "slate",
    shape: "round",
    icon: "fas fa-sync-alt"
  }, "Virar C\xE2mera"))), /*#__PURE__*/React.createElement(H2, null, "Dados Pessoais e Acesso ao Painel"), /*#__PURE__*/React.createElement(Select, {
    id: "local",
    label: "Local de Treinamento:",
    size: "lg",
    options: ['Selecione...', ...PROFESSORES]
  }), /*#__PURE__*/React.createElement(Input, {
    id: "nome",
    label: "Nome completo:",
    size: "lg"
  }), /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'grid',
      gridTemplateColumns: '1fr 1fr',
      gap: 15
    }
  }, /*#__PURE__*/React.createElement(Input, {
    id: "nasc",
    label: "Nascimento:",
    type: "date",
    size: "lg",
    onChange: e => setMenor(new Date(e.target.value) > new Date(Date.now() - 12 * 365.25 * 864e5))
  }), /*#__PURE__*/React.createElement(Input, {
    id: "idade",
    label: "Idade:",
    size: "lg",
    readOnly: true,
    value: menor ? '11' : ''
  })), /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'grid',
      gridTemplateColumns: '1fr 1fr',
      gap: 15
    }
  }, /*#__PURE__*/React.createElement(Input, {
    id: "doc",
    label: "CPF ou RG:",
    size: "lg"
  }), /*#__PURE__*/React.createElement(Input, {
    id: "cel",
    label: "Telefone / WhatsApp:",
    size: "lg",
    placeholder: "(00) 00000-0000"
  })), /*#__PURE__*/React.createElement(Input, {
    id: "email",
    label: "E-mail (Login por E-mail):",
    size: "lg",
    placeholder: "seuemail@exemplo.com"
  }), /*#__PURE__*/React.createElement(Input, {
    id: "senha",
    label: "Senha de Acesso ao Painel:",
    size: "lg",
    type: "password",
    placeholder: "Crie uma senha para acessar seu painel"
  }), /*#__PURE__*/React.createElement(Input, {
    id: "end",
    label: "Endere\xE7o Completo:",
    size: "lg"
  }), menor ? /*#__PURE__*/React.createElement("div", {
    className: "le-inset",
    style: {
      borderRadius: 10,
      marginTop: 20
    }
  }, /*#__PURE__*/React.createElement("h2", {
    style: {
      fontSize: '1.2rem',
      color: 'var(--blue-900)',
      marginBottom: 12
    }
  }, /*#__PURE__*/React.createElement("i", {
    className: "fas fa-shield-alt"
  }), " Dados do Respons\xE1vel (Obrigat\xF3rio para menores de 12 anos)"), /*#__PURE__*/React.createElement(Input, {
    id: "resp",
    label: "Nome do Respons\xE1vel:",
    size: "lg"
  }), /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'grid',
      gridTemplateColumns: '1fr 1fr',
      gap: 15
    }
  }, /*#__PURE__*/React.createElement(Input, {
    id: "respTel",
    label: "Telefone do Respons\xE1vel:",
    size: "lg",
    placeholder: "(00) 00000-0000"
  }), /*#__PURE__*/React.createElement(Input, {
    id: "paren",
    label: "Parentesco:",
    size: "lg"
  }))) : null);
}
function Step2() {
  const perguntas = ['1. Doença crônica?', '2. Problemas cardíacos?', '3. Asma/Problemas respiratórios?', '4. Lesões (joelho, coluna, etc.)?', '5. Já realizou cirurgia?', '6. Uso contínuo de medicamentos?', '7. Alergia a medicamentos?', '8. Apto(a) para atividades físicas?'];
  return /*#__PURE__*/React.createElement("div", {
    style: {
      animation: 'le-fade-in 0.4s var(--ease-standard)'
    }
  }, /*#__PURE__*/React.createElement(H2, null, "Informa\xE7\xF5es de Sa\xFAde"), /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'grid',
      gridTemplateColumns: '1fr 1fr',
      gap: 15
    }
  }, perguntas.map((p, i) => /*#__PURE__*/React.createElement(Select, {
    key: p,
    id: 'q' + i,
    label: p,
    size: "lg",
    options: i === 7 ? ['Sim', 'Não'] : ['Não', 'Sim']
  }))), /*#__PURE__*/React.createElement(H2, null, "Experi\xEAncia & Uniforme"), /*#__PURE__*/React.createElement(Select, {
    id: "jaPraticou",
    label: "J\xE1 praticou capoeira antes?",
    size: "lg",
    options: ['Não', 'Sim']
  }), /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'grid',
      gridTemplateColumns: '1fr 1fr',
      gap: 15
    }
  }, /*#__PURE__*/React.createElement(Select, {
    id: "camiseta",
    label: "Tamanho da Camiseta:",
    size: "lg",
    options: ['P', 'M', 'G', 'GG', 'Infantil']
  }), /*#__PURE__*/React.createElement(Select, {
    id: "calca",
    label: "Tamanho da Cal\xE7a:",
    size: "lg",
    options: ['P', 'M', 'G', 'GG', 'Infantil']
  })));
}
function Step3() {
  return /*#__PURE__*/React.createElement("div", {
    style: {
      animation: 'le-fade-in 0.4s var(--ease-standard)',
      display: 'grid',
      gap: 20
    }
  }, /*#__PURE__*/React.createElement(H2, null, "Primeiras Orienta\xE7\xF5es ao Aluno e Respons\xE1vel"), /*#__PURE__*/React.createElement(RuleBox, {
    title: "Hor\xE1rios"
  }, /*#__PURE__*/React.createElement("ul", null, /*#__PURE__*/React.createElement("li", null, "Chegar com 10 a 15 minutos de anteced\xEAncia."), /*#__PURE__*/React.createElement("li", null, "Ap\xF3s 15 minutos de atraso, o aluno poder\xE1 aguardar autoriza\xE7\xE3o para entrar."), /*#__PURE__*/React.createElement("li", null, "Evitar faltas sem justificativa. Em caso de aus\xEAncia, avisar com anteced\xEAncia."))), /*#__PURE__*/React.createElement(RuleBox, {
    title: "Uniforme e Apresenta\xE7\xE3o",
    warning: "\u26A0\uFE0F N\xE3o \xE9 permitido treinar de bon\xE9, chinelo, rel\xF3gio, correntes ou acess\xF3rios que possam causar acidentes."
  }, /*#__PURE__*/React.createElement("p", null, /*#__PURE__*/React.createElement("strong", null, "\xC9 obrigat\xF3rio o uso do uniforme oficial do grupo:")), /*#__PURE__*/React.createElement("ul", null, /*#__PURE__*/React.createElement("li", null, /*#__PURE__*/React.createElement("strong", null, "Treino:"), " Camiseta oficial, cal\xE7a branca, cord\xE3o, descal\xE7o."), /*#__PURE__*/React.createElement("li", null, /*#__PURE__*/React.createElement("strong", null, "Passeio/Eventos:"), " Camiseta oficial de passeio, cal\xE7a branca, cord\xE3o."))), /*#__PURE__*/React.createElement(RuleBox, {
    title: "Disciplina e Conduta"
  }, /*#__PURE__*/React.createElement("p", null, "A capoeira \xE9 baseada em: Respeito aos mestres, professores e colegas; Obedi\xEAncia \xE0s orienta\xE7\xF5es; Boa conviv\xEAncia e Linguagem adequada."), /*#__PURE__*/React.createElement("h4", {
    style: {
      color: 'red',
      marginTop: 10
    }
  }, "N\xC3O SER\xC1 PERMITIDO:"), /*#__PURE__*/React.createElement("ul", null, /*#__PURE__*/React.createElement("li", null, "Brigas e Desrespeito."), /*#__PURE__*/React.createElement("li", null, "Palavr\xF5es."), /*#__PURE__*/React.createElement("li", null, "Uso de celular durante a aula."))), /*#__PURE__*/React.createElement(RuleBox, {
    title: "Sistema de Cord\xF5es e Pagamentos"
  }, /*#__PURE__*/React.createElement("p", null, "Os cord\xF5es representam evolu\xE7\xE3o, disciplina e tempo de dedica\xE7\xE3o, trocados mediante frequ\xEAncia e evolu\xE7\xE3o t\xE9cnica."), /*#__PURE__*/React.createElement("ul", null, /*#__PURE__*/React.createElement("li", null, /*#__PURE__*/React.createElement("strong", null, "Mensalidade:"), " R$ 50,00 por m\xEAs.")), /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'grid',
      gridTemplateColumns: '1fr 1fr',
      gap: 15,
      marginTop: 10
    }
  }, /*#__PURE__*/React.createElement(Select, {
    id: "dataPg",
    label: "Melhor data para pagamento:",
    size: "lg",
    options: ['Selecione o dia...', 'Dia 5', 'Dia 10', 'Dia 15', 'Dia 20', 'Dia 25']
  }), /*#__PURE__*/React.createElement(Select, {
    id: "formaPg",
    label: "Forma de pagamento:",
    size: "lg",
    options: ['Selecione a forma...', 'Dinheiro', 'PIX', 'Cartão de Crédito', 'Cartão de Débito']
  }))));
}
function Step4() {
  return /*#__PURE__*/React.createElement("div", {
    style: {
      animation: 'le-fade-in 0.4s var(--ease-standard)',
      display: 'grid',
      gap: 20
    }
  }, /*#__PURE__*/React.createElement(H2, null, "Autoriza\xE7\xE3o e Termos"), /*#__PURE__*/React.createElement(RuleBox, {
    title: "Autoriza\xE7\xE3o de Uso de Imagem"
  }, /*#__PURE__*/React.createElement("p", null, "Eu autorizo o Grupo de Capoeira Liberdade e Express\xE3o a utilizar minha imagem (ou do menor sob minha responsabilidade) em fotos e v\xEDdeos realizados durante aulas, treinos, eventos e apresenta\xE7\xF5es, para fins de divulga\xE7\xE3o em redes sociais e materiais institucionais, sem qualquer \xF4nus financeiro."), /*#__PURE__*/React.createElement(Select, {
    id: "usoImagem",
    label: "Escolha uma op\xE7\xE3o:",
    size: "lg",
    options: ['Selecione...', 'AUTORIZO', 'NÃO AUTORIZO']
  })), /*#__PURE__*/React.createElement(RuleBox, {
    title: "Termo de Responsabilidade"
  }, /*#__PURE__*/React.createElement("p", null, "Declaro que as informa\xE7\xF5es preenchidas s\xE3o verdadeiras e que estou ciente das atividades f\xEDsicas desenvolvidas pelo Grupo de Capoeira Liberdade e Express\xE3o, assumindo total responsabilidade por minha participa\xE7\xE3o (ou do menor sob minha responsabilidade)."), /*#__PURE__*/React.createElement("label", {
    style: {
      display: 'flex',
      gap: 10,
      alignItems: 'start',
      marginTop: 15
    }
  }, /*#__PURE__*/React.createElement("input", {
    type: "checkbox"
  }), /*#__PURE__*/React.createElement("strong", null, "Li e concordo com as regras de disciplina, uniforme, pagamentos e assumo a responsabilidade descrita acima."))));
}
Object.assign(window, {
  Step1,
  Step2,
  Step3,
  Step4
});
})(); } catch (e) { __ds_ns.__errors.push({ path: "ui_kits/inscricao/steps.jsx", error: String((e && e.message) || e) }); }

// ui_kits/painel-admin/AcademiasTab.jsx
try { (() => {
const {
  SectionHeader,
  Card,
  Input,
  Button,
  AcademyCard
} = window.CapoeiraLiberdadeEExpressODesignSystem_5cc6bd;
function AcademiasTab({
  academias,
  onCriar
}) {
  const [form, setForm] = React.useState({
    nome: '',
    prof: '',
    login: '',
    senha: ''
  });
  const set = k => e => setForm({
    ...form,
    [k]: e.target.value
  });
  const submit = e => {
    e.preventDefault();
    if (!form.nome) return;
    onCriar({
      nome: form.nome,
      prof: form.prof,
      login: form.login
    });
    setForm({
      nome: '',
      prof: '',
      login: '',
      senha: ''
    });
  };
  return /*#__PURE__*/React.createElement("section", {
    style: {
      animation: 'le-fade-in 0.35s var(--ease-standard)'
    }
  }, /*#__PURE__*/React.createElement(SectionHeader, null, "Gest\xE3o de Academias e Permiss\xF5es"), /*#__PURE__*/React.createElement(Card, {
    style: {
      marginBottom: 20
    }
  }, /*#__PURE__*/React.createElement("h3", {
    style: {
      color: 'var(--blue-900)',
      fontSize: '1.1rem'
    }
  }, "Cadastrar Nova Academia / Professor"), /*#__PURE__*/React.createElement("form", {
    onSubmit: submit,
    style: {
      display: 'grid',
      gap: 15,
      marginTop: 15
    }
  }, /*#__PURE__*/React.createElement(Input, {
    placeholder: "Nome da Academia (Ex: Academia Mestre Profeta)",
    value: form.nome,
    onChange: set('nome')
  }), /*#__PURE__*/React.createElement(Input, {
    placeholder: "Nome do Professor Respons\xE1vel",
    value: form.prof,
    onChange: set('prof')
  }), /*#__PURE__*/React.createElement(Input, {
    placeholder: "E-mail ou Celular de Login",
    value: form.login,
    onChange: set('login')
  }), /*#__PURE__*/React.createElement(Input, {
    type: "password",
    placeholder: "Senha de Acesso (m\xEDn. 6 caracteres)",
    value: form.senha,
    onChange: set('senha')
  }), /*#__PURE__*/React.createElement(Button, {
    type: "submit",
    size: "sm",
    style: {
      width: 250
    }
  }, "Cadastrar Academia"))), /*#__PURE__*/React.createElement("h3", {
    style: {
      color: 'var(--blue-900)',
      fontFamily: 'var(--font-display)'
    }
  }, "Academias Registradas"), /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'grid',
      gridTemplateColumns: 'repeat(auto-fill,minmax(300px,1fr))',
      gap: 15,
      marginTop: 15
    }
  }, academias.map((a, i) => /*#__PURE__*/React.createElement(AcademyCard, {
    key: a.nome,
    index: i,
    name: a.nome,
    teacher: a.prof,
    login: a.login
  }))));
}
Object.assign(window, {
  AcademiasTab
});
})(); } catch (e) { __ds_ns.__errors.push({ path: "ui_kits/painel-admin/AcademiasTab.jsx", error: String((e && e.message) || e) }); }

// ui_kits/painel-admin/AlunosTab.jsx
try { (() => {
const {
  SectionHeader,
  StudentCard,
  EmptyState,
  ChartBox,
  Badge
} = window.CapoeiraLiberdadeEExpressODesignSystem_5cc6bd;
function BarrasFake({
  dados
}) {
  const max = Math.max(...dados.map(d => d[1]));
  return /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      alignItems: 'flex-end',
      gap: 14,
      height: '100%',
      padding: '10px 4px 0'
    }
  }, dados.map(([rot, v]) => /*#__PURE__*/React.createElement("div", {
    key: rot,
    style: {
      flex: 1,
      textAlign: 'center',
      display: 'flex',
      flexDirection: 'column',
      justifyContent: 'flex-end',
      height: '100%'
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      height: v / max * 78 + '%',
      background: 'var(--teal-500)',
      borderRadius: '6px 6px 0 0'
    }
  }), /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 10,
      color: 'var(--text-muted)',
      marginTop: 6
    }
  }, rot))));
}
function AlunosTab({
  alunos,
  busca,
  onDetalhes
}) {
  const lista = alunos.filter(a => a.nome.toLowerCase().includes(busca.toLowerCase()));
  return /*#__PURE__*/React.createElement("section", {
    style: {
      animation: 'le-fade-in 0.35s var(--ease-standard)'
    }
  }, /*#__PURE__*/React.createElement(SectionHeader, null, "Lista Completa de Alunos - Painel de Controle e Distribui\xE7\xE3o"), /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'grid',
      gridTemplateColumns: 'repeat(auto-fill,minmax(320px,1fr))',
      gap: 15,
      marginBottom: 30
    }
  }, lista.length === 0 ? /*#__PURE__*/React.createElement("div", {
    style: {
      gridColumn: '1/-1'
    }
  }, /*#__PURE__*/React.createElement(EmptyState, {
    icon: "fas fa-users"
  }, "Nenhum aluno encontrado.")) : lista.map((a, i) => /*#__PURE__*/React.createElement(StudentCard, {
    key: a.id,
    index: i,
    name: a.nome,
    academy: a.academia,
    cordao: a.cordao,
    age: a.idade,
    photo: a.foto,
    academies: window.NOMES_ACADEMIAS,
    onDetails: () => onDetalhes(a)
  }))), /*#__PURE__*/React.createElement("div", {
    style: {
      marginTop: 50
    }
  }, /*#__PURE__*/React.createElement(SectionHeader, {
    tone: "blue",
    icon: "fas fa-chart-pie"
  }, "Intelig\xEAncia de Dados e Evolu\xE7\xE3o"), /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'grid',
      gridTemplateColumns: '1fr 1fr',
      gap: 30
    }
  }, /*#__PURE__*/React.createElement(ChartBox, {
    title: "Term\xF4metro de Aprova\xE7\xE3o (Meta 70%)",
    height: 200
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      height: '100%',
      display: 'flex',
      flexDirection: 'column',
      justifyContent: 'center',
      gap: 12
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: '3rem',
      fontWeight: 800,
      color: 'var(--teal-500)',
      textAlign: 'center'
    }
  }, "68%"), /*#__PURE__*/React.createElement("div", {
    className: "le-cordao-track"
  }, /*#__PURE__*/React.createElement("div", {
    className: "le-cordao-fill",
    style: {
      width: '68%',
      '--c1': '#389E92',
      '--c2': '#00E676',
      '--c3': '#389E92'
    }
  })), /*#__PURE__*/React.createElement("div", {
    style: {
      textAlign: 'center'
    }
  }, /*#__PURE__*/React.createElement(Badge, {
    tone: "warn"
  }, "2 pontos da meta")))), /*#__PURE__*/React.createElement(ChartBox, {
    title: "Status de Reten\xE7\xE3o (Ativos vs Inativos)",
    height: 200
  }, /*#__PURE__*/React.createElement(BarrasFake, {
    dados: [['Ativo', 41], ['Pausa', 7], ['Lesionado', 3], ['Inativo', 9]]
  })), /*#__PURE__*/React.createElement(ChartBox, {
    title: "Pir\xE2mide de Gradua\xE7\xE3o (Quantidade por Cord\xE3o)",
    height: 200,
    fullWidth: true
  }, /*#__PURE__*/React.createElement(BarrasFake, {
    dados: [['Iniciante', 22], ['Escravo', 14], ['Fugitivo', 9], ['Quilombola', 7], ['Vagante', 4], ['Liberto', 3], ['Instrutor', 1]]
  })))));
}
Object.assign(window, {
  AlunosTab
});
})(); } catch (e) { __ds_ns.__errors.push({ path: "ui_kits/painel-admin/AlunosTab.jsx", error: String((e && e.message) || e) }); }

// ui_kits/painel-admin/ProntuarioModal.jsx
try { (() => {
const {
  Modal,
  Input,
  Select,
  Button,
  CordaoBar,
  StarRating
} = window.CapoeiraLiberdadeEExpressODesignSystem_5cc6bd;
const CRITERIOS = ['Ginga e Base', 'Acrobacias', 'Respeito', 'Disciplina', 'Pontualidade', 'Freq. Aulas', 'Freq. Rodas', 'Eventos', 'Pandeiro', 'Atabaque', 'Berimbau', 'Canta/Responde', 'Higiene', 'Aprendizado', 'Fundamentos'];
function ProntuarioModal({
  aluno,
  onClose,
  onSalvar
}) {
  const [notas, setNotas] = React.useState(() => CRITERIOS.map((_, i) => 3 + i % 3));
  const pct = Math.floor(notas.reduce((a, b) => a + b, 0) / (CRITERIOS.length * 5) * 100);
  return /*#__PURE__*/React.createElement(Modal, {
    size: "lg",
    onClose: onClose
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      textAlign: 'center',
      marginBottom: 20
    }
  }, /*#__PURE__*/React.createElement("img", {
    src: aluno.foto,
    alt: "",
    style: {
      width: 90,
      height: 90,
      borderRadius: '50%',
      objectFit: 'cover',
      border: '3px solid var(--teal-500)',
      marginBottom: 10
    }
  }), /*#__PURE__*/React.createElement("h2", {
    style: {
      color: 'var(--blue-900)'
    }
  }, "EDITAR ALUNO"), /*#__PURE__*/React.createElement("p", {
    style: {
      color: 'var(--text-muted)'
    }
  }, /*#__PURE__*/React.createElement("i", {
    className: "fas fa-map-marker-alt"
  }), " ", aluno.academia)), /*#__PURE__*/React.createElement("div", {
    className: "le-inset",
    style: {
      background: '#f9fbfb',
      borderRadius: 12,
      marginBottom: 25
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      justifyContent: 'space-between',
      marginBottom: 10,
      fontWeight: 700,
      fontSize: '0.9rem'
    }
  }, /*#__PURE__*/React.createElement("span", null, "Progresso para o pr\xF3ximo cord\xE3o"), /*#__PURE__*/React.createElement("span", null, pct, "%")), /*#__PURE__*/React.createElement(CordaoBar, {
    size: "sm",
    percent: pct,
    colors: ['#D2691E', '#D32F2F', '#D2691E']
  })), /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'grid',
      gridTemplateColumns: '250px 1fr',
      gap: 30
    }
  }, /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement(Input, {
    label: "Nome do Aluno:",
    defaultValue: aluno.nome
  }), /*#__PURE__*/React.createElement(Input, {
    label: "Idade:",
    type: "number",
    defaultValue: aluno.idade
  }), /*#__PURE__*/React.createElement(Select, {
    label: "Status:",
    defaultValue: aluno.status,
    options: ['Ativo', 'Inativo', 'Pausa', 'Lesionado']
  }), /*#__PURE__*/React.createElement(Select, {
    label: "Gradua\xE7\xE3o Atual:",
    defaultValue: aluno.cordao,
    options: ['Iniciante', 'Escravo', 'Fugitivo', 'Quilombola', 'Vagante', 'Liberto', 'Instrutor', 'Professor', 'Mestre']
  }), /*#__PURE__*/React.createElement(Button, {
    variant: "danger-outline",
    size: "sm",
    block: true,
    icon: "fas fa-trash",
    style: {
      marginTop: 20
    }
  }, "Excluir Aluno")), /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("h3", {
    style: {
      color: 'var(--blue-900)',
      fontSize: '1.05rem',
      marginBottom: 15
    }
  }, "Crit\xE9rios de Evolu\xE7\xE3o (0 a 10)"), /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'grid',
      gridTemplateColumns: 'repeat(3,1fr)',
      gap: 20
    }
  }, CRITERIOS.map((c, i) => /*#__PURE__*/React.createElement("div", {
    key: c,
    style: {
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      background: '#fff',
      border: '1px solid var(--border-card)',
      padding: 10,
      borderRadius: 8,
      gap: 6
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      fontSize: '0.8rem',
      textAlign: 'center'
    }
  }, c), /*#__PURE__*/React.createElement(StarRating, {
    value: notas[i],
    onChange: v => setNotas(n => n.map((x, j) => j === i ? v : x))
  })))))), /*#__PURE__*/React.createElement("div", {
    style: {
      marginTop: 20,
      textAlign: 'center'
    }
  }, /*#__PURE__*/React.createElement(Button, {
    shape: "pill",
    icon: "fas fa-save",
    onClick: onSalvar
  }, "Atualizar Prontu\xE1rio")));
}
Object.assign(window, {
  ProntuarioModal
});
})(); } catch (e) { __ds_ns.__errors.push({ path: "ui_kits/painel-admin/ProntuarioModal.jsx", error: String((e && e.message) || e) }); }

// ui_kits/painel-admin/app.jsx
try { (() => {
const {
  TopNav,
  NavItem,
  IconButton,
  Card,
  Select,
  Toast
} = window.CapoeiraLiberdadeEExpressODesignSystem_5cc6bd;
function AdminApp() {
  const [aba, setAba] = React.useState('alunos');
  const [busca, setBusca] = React.useState('');
  const [academias, setAcademias] = React.useState(window.ACADEMIAS);
  const [aberto, setAberto] = React.useState(null);
  const [toast, setToast] = React.useState(null);
  const notificar = msg => {
    setToast(msg);
    setTimeout(() => setToast(null), 3000);
  };
  return /*#__PURE__*/React.createElement("div", {
    style: {
      background: 'var(--surface-app)',
      minHeight: '100vh'
    }
  }, /*#__PURE__*/React.createElement(TopNav, {
    logoSrc: "../../assets/logo-liberdade150.png",
    right: /*#__PURE__*/React.createElement(React.Fragment, null, /*#__PURE__*/React.createElement("div", {
      className: "le-search"
    }, /*#__PURE__*/React.createElement("input", {
      placeholder: "Buscar aluno...",
      value: busca,
      onChange: e => setBusca(e.target.value),
      "aria-label": "Buscar aluno"
    }), /*#__PURE__*/React.createElement("i", {
      className: "fas fa-search"
    })), /*#__PURE__*/React.createElement("div", {
      style: {
        display: 'flex',
        alignItems: 'center',
        gap: 10,
        fontWeight: 'bold'
      }
    }, /*#__PURE__*/React.createElement("img", {
      src: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=80",
      alt: "",
      style: {
        width: 40,
        height: 40,
        borderRadius: '50%',
        objectFit: 'cover'
      }
    }), /*#__PURE__*/React.createElement("span", null, "Admin Master")), /*#__PURE__*/React.createElement(IconButton, {
      icon: "fas fa-sign-out-alt",
      label: "Sair da conta",
      onClick: () => notificar('Sessão encerrada.')
    }))
  }, /*#__PURE__*/React.createElement(NavItem, {
    variant: "underline",
    active: aba === 'alunos',
    onClick: () => setAba('alunos')
  }, "Alunos Master"), /*#__PURE__*/React.createElement(NavItem, {
    variant: "underline",
    active: aba === 'academias',
    onClick: () => setAba('academias')
  }, "Gest\xE3o de Academias"), /*#__PURE__*/React.createElement(NavItem, {
    variant: "underline",
    active: aba === 'financeiro',
    onClick: () => setAba('financeiro')
  }, "Financeiro")), /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      gap: 25,
      padding: '25px 30px',
      maxWidth: 1600,
      margin: '0 auto'
    }
  }, /*#__PURE__*/React.createElement("main", {
    style: {
      flex: 1,
      minWidth: 0
    }
  }, aba === 'alunos' && /*#__PURE__*/React.createElement(AlunosTab, {
    alunos: window.ALUNOS,
    busca: busca,
    onDetalhes: setAberto
  }), aba === 'academias' && /*#__PURE__*/React.createElement(AcademiasTab, {
    academias: academias,
    onCriar: a => {
      setAcademias(x => [...x, a]);
      notificar('Academia cadastrada.');
    }
  }), aba === 'financeiro' && /*#__PURE__*/React.createElement("section", {
    style: {
      animation: 'le-fade-in 0.35s var(--ease-standard)'
    }
  }, /*#__PURE__*/React.createElement("div", {
    className: "le-section-header"
  }, /*#__PURE__*/React.createElement("h2", null, "Gest\xE3o Financeira e Pagamentos")), /*#__PURE__*/React.createElement(Card, null, /*#__PURE__*/React.createElement("p", null, "Acompanhamento de mensalidades e vendas da lojinha em tempo real.")))), /*#__PURE__*/React.createElement("aside", {
    style: {
      width: 300,
      display: 'flex',
      flexDirection: 'column',
      gap: 15
    }
  }, /*#__PURE__*/React.createElement(Card, null, /*#__PURE__*/React.createElement("h3", {
    style: {
      color: 'var(--blue-900)',
      fontSize: '1.05rem'
    }
  }, "Filtros Avan\xE7ados"), /*#__PURE__*/React.createElement("p", {
    style: {
      fontSize: '0.8rem',
      color: 'var(--ink-500)',
      margin: '10px 0'
    }
  }, "Ao filtrar, os gr\xE1ficos mostrar\xE3o apenas os dados da academia selecionada."), /*#__PURE__*/React.createElement(Select, {
    options: ['Todas as Academias', ...window.NOMES_ACADEMIAS]
  })))), aberto && /*#__PURE__*/React.createElement(ProntuarioModal, {
    aluno: aberto,
    onClose: () => setAberto(null),
    onSalvar: () => {
      setAberto(null);
      notificar('Prontuário atualizado.');
    }
  }), /*#__PURE__*/React.createElement("div", {
    style: {
      position: 'fixed',
      bottom: 20,
      right: 20,
      zIndex: 1200
    }
  }, toast && /*#__PURE__*/React.createElement(Toast, {
    tone: "success"
  }, toast)));
}
ReactDOM.createRoot(document.getElementById('root')).render(/*#__PURE__*/React.createElement(AdminApp, null));
})(); } catch (e) { __ds_ns.__errors.push({ path: "ui_kits/painel-admin/app.jsx", error: String((e && e.message) || e) }); }

// ui_kits/painel-admin/data.jsx
try { (() => {
const ALUNOS = [{
  id: 1,
  nome: 'Ana Paula Ribeiro',
  academia: 'Mestre Profeta',
  cordao: 'Quilombola',
  idade: 17,
  status: 'Ativo',
  foto: 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=200'
}, {
  id: 2,
  nome: 'Carlos Eduardo Nunes',
  academia: 'Professora Taynara',
  cordao: 'Fugitivo',
  idade: 11,
  status: 'Ativo',
  foto: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=200'
}, {
  id: 3,
  nome: 'Juliana Souza Lima',
  academia: 'Mestre Abraão',
  cordao: 'Liberto',
  idade: 24,
  status: 'Pausa',
  foto: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=200'
}, {
  id: 4,
  nome: 'Marcos Vinícius Alves',
  academia: 'Professor Maick',
  cordao: 'Escravo',
  idade: 9,
  status: 'Ativo',
  foto: 'https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?w=200'
}, {
  id: 5,
  nome: 'Beatriz Carvalho',
  academia: 'Mestre Omar',
  cordao: 'Vagante',
  idade: 19,
  status: 'Lesionado',
  foto: 'https://images.unsplash.com/photo-1517841905240-472988babdf9?w=200'
}, {
  id: 6,
  nome: 'Rafael Tigoy Moreira',
  academia: 'Professor Tigoy',
  cordao: 'Instrutor',
  idade: 28,
  status: 'Ativo',
  foto: 'https://images.unsplash.com/photo-1522075469751-3a6694fb2f61?w=200'
}];
const ACADEMIAS = [{
  nome: 'Academia Mestre Profeta',
  prof: 'Isaías Ramos Maior',
  login: 'profeta@liberdade.com'
}, {
  nome: 'Academia Professora Taynara',
  prof: 'Taynara Ferreira',
  login: '(62) 99999-1020'
}, {
  nome: 'Academia Mestre Abraão',
  prof: 'Abraão dos Santos',
  login: 'abraao@liberdade.com'
}, {
  nome: 'Academia Professor Maick',
  prof: 'Maick Oliveira',
  login: 'maick@liberdade.com'
}];
const NOMES_ACADEMIAS = ['Mestre Profeta', 'Professora Taynara', 'Mestre Abraão', 'Mestre Omar', 'Mestre Carlinhos', 'Professor Maick', 'Professor Tigoy', 'Professor Rafinha', 'Instrutor Leiliano', 'Professor Lebrinha'];
Object.assign(window, {
  ALUNOS,
  ACADEMIAS,
  NOMES_ACADEMIAS
});
})(); } catch (e) { __ds_ns.__errors.push({ path: "ui_kits/painel-admin/data.jsx", error: String((e && e.message) || e) }); }

// ui_kits/portal-aluno/AulasTab.jsx
try { (() => {
const {
  Card,
  LessonCard
} = window.CapoeiraLiberdadeEExpressODesignSystem_5cc6bd;
const AULAS = [{
  t: 'Módulo 1: Ginga e Base Perfeita',
  d: 'Aprenda os fundamentos essenciais da movimentação base e postura na roda de capoeira.',
  img: 'https://images.unsplash.com/photo-1517649763962-0c623066013b?w=600'
}, {
  t: 'Módulo 2: Toques de Berimbau (Angola e Regional)',
  d: 'Domine o ritmo, a afinação e os principais toques que comandam a roda.',
  img: 'https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?w=600'
}, {
  t: 'Módulo 3: Floreios e Movimentos Avançados',
  d: 'Técnicas de segurança, saltos e floreios para enriquecer o seu jogo na capoeira.',
  img: 'https://images.unsplash.com/photo-1519638831568-d9897f54ed69?w=600'
}];
function AulasTab({
  onToast
}) {
  const pdfs = ['Apostila Oficial do Grupo', 'História da Capoeira'];
  return /*#__PURE__*/React.createElement("div", {
    style: {
      animation: 'le-fade-in 0.4s var(--ease-standard)'
    }
  }, /*#__PURE__*/React.createElement(Card, {
    variant: "panel",
    style: {
      marginBottom: 25
    }
  }, /*#__PURE__*/React.createElement("h3", {
    style: {
      color: 'var(--blue-900)',
      marginBottom: 10
    }
  }, /*#__PURE__*/React.createElement("i", {
    className: "fas fa-book-reader"
  }), " Biblioteca de Hist\xF3ria e Cultura"), /*#__PURE__*/React.createElement("p", {
    style: {
      color: 'var(--text-muted)',
      fontSize: '0.95rem',
      marginBottom: 15
    }
  }, "Aprofunde seus conhecimentos sobre as ra\xEDzes da capoeira, os grandes mestres e a trajet\xF3ria do nosso grupo."), /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'grid',
      gridTemplateColumns: 'repeat(auto-fill,minmax(250px,1fr))',
      gap: 15
    }
  }, pdfs.map((p, i) => /*#__PURE__*/React.createElement("div", {
    key: p,
    className: "le-inset",
    style: {
      borderRadius: 12,
      display: 'flex',
      alignItems: 'center',
      gap: 15
    }
  }, /*#__PURE__*/React.createElement("i", {
    className: "fas fa-file-pdf",
    style: {
      fontSize: '2rem',
      color: 'var(--danger)'
    }
  }), /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("h4", {
    style: {
      fontSize: '0.95rem',
      color: 'var(--blue-900)'
    }
  }, p), /*#__PURE__*/React.createElement("button", {
    onClick: () => onToast('Baixando "' + p + '"…'),
    style: {
      fontSize: '0.85rem',
      color: 'var(--teal-500)',
      fontWeight: 'bold',
      background: 'none',
      border: 'none',
      cursor: 'pointer',
      padding: 0,
      fontFamily: 'var(--font-body)'
    }
  }, /*#__PURE__*/React.createElement("i", {
    className: "fas fa-download"
  }), " Baixar PDF (", i ? '1.8' : '2.4', " MB)")))))), /*#__PURE__*/React.createElement("h3", {
    style: {
      color: 'var(--blue-900)',
      marginBottom: 15,
      fontFamily: 'var(--font-display)'
    }
  }, /*#__PURE__*/React.createElement("i", {
    className: "fas fa-play-circle"
  }), " Videoaulas e Fundamentos Pr\xE1ticos"), /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'grid',
      gridTemplateColumns: 'repeat(auto-fill,minmax(320px,1fr))',
      gap: 20
    }
  }, AULAS.map(a => /*#__PURE__*/React.createElement(LessonCard, {
    key: a.t,
    title: a.t,
    description: a.d,
    thumbnail: a.img
  }))));
}
Object.assign(window, {
  AulasTab
});
})(); } catch (e) { __ds_ns.__errors.push({ path: "ui_kits/portal-aluno/AulasTab.jsx", error: String((e && e.message) || e) }); }

// ui_kits/portal-aluno/EvolucaoTab.jsx
try { (() => {
const {
  ProfileBanner,
  TeacherBox,
  CordaoBar,
  CriterionPill,
  Card
} = window.CapoeiraLiberdadeEExpressODesignSystem_5cc6bd;
const CRITERIOS = [['Ginga e Base', 9], ['Acrobacias', 6], ['Respeito', 10], ['Disciplina', 9], ['Pontualidade', 8], ['Freq. Aulas', 9], ['Freq. Rodas', 7], ['Eventos', 6], ['Pandeiro', 5], ['Atabaque', 6], ['Berimbau', 6], ['Canta/Responde', 7], ['Higiene', 10], ['Aprendizado', 8], ['Fundamentos', 8]];
function EvolucaoTab({
  aluno
}) {
  const total = CRITERIOS.reduce((s, c) => s + c[1], 0);
  const pct = Math.floor(total / (CRITERIOS.length * 10) * 100);
  return /*#__PURE__*/React.createElement("div", {
    style: {
      animation: 'le-fade-in 0.4s var(--ease-standard)'
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      marginBottom: 30
    }
  }, /*#__PURE__*/React.createElement(ProfileBanner, {
    name: aluno.nome,
    academy: aluno.academia,
    cordao: aluno.cordao,
    photo: aluno.foto
  })), /*#__PURE__*/React.createElement(Card, {
    variant: "panel",
    style: {
      marginBottom: 25
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'center',
      flexWrap: 'wrap',
      gap: 10
    }
  }, /*#__PURE__*/React.createElement("h3", {
    style: {
      color: 'var(--blue-900)',
      fontSize: '1.15rem'
    }
  }, /*#__PURE__*/React.createElement("i", {
    className: "fas fa-thermometer-half"
  }), " Term\xF4metro de Prontid\xE3o para Gradua\xE7\xE3o: ", /*#__PURE__*/React.createElement("span", {
    style: {
      color: 'var(--teal-500)'
    }
  }, "Vagante")), /*#__PURE__*/React.createElement("span", {
    style: {
      fontSize: '1.5rem',
      fontWeight: 800,
      color: 'var(--teal-500)'
    }
  }, pct, "%")), /*#__PURE__*/React.createElement("p", {
    style: {
      color: 'var(--text-muted)',
      fontSize: '0.9rem',
      marginTop: 6
    }
  }, "Atinja 70% ou mais nos crit\xE9rios avaliados pelo seu Mestre/Professor para estar apto \xE0 nova fase!"), /*#__PURE__*/React.createElement("div", {
    style: {
      margin: '20px 0 10px'
    }
  }, /*#__PURE__*/React.createElement(CordaoBar, {
    percent: pct,
    colors: ['#D2691E', '#D32F2F', '#D2691E']
  }))), /*#__PURE__*/React.createElement(Card, {
    variant: "panel",
    style: {
      marginBottom: 25
    }
  }, /*#__PURE__*/React.createElement("h3", {
    style: {
      color: 'var(--blue-900)',
      marginBottom: 15
    }
  }, /*#__PURE__*/React.createElement("i", {
    className: "fas fa-chalkboard-teacher"
  }), " Seu Mestre / Professor Respons\xE1vel"), /*#__PURE__*/React.createElement(TeacherBox, {
    name: "Mestre Profeta (Isa\xEDas Ramos Maior)",
    title: "Mestre de Capoeira - Fundador",
    bio: "Pioneiro do grupo com mais de 30 anos dedicados \xE0 capoeira, formando centenas de alunos e disseminando a cultura e disciplina por onde passa.",
    photo: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=200"
  })), /*#__PURE__*/React.createElement(Card, {
    variant: "panel"
  }, /*#__PURE__*/React.createElement("h3", {
    style: {
      color: 'var(--blue-900)',
      marginBottom: 20
    }
  }, /*#__PURE__*/React.createElement("i", {
    className: "fas fa-star",
    style: {
      color: 'var(--star-filled)'
    }
  }), " Notas por Fundamentos e Crit\xE9rios"), /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'grid',
      gridTemplateColumns: 'repeat(auto-fill,minmax(240px,1fr))',
      gap: 15
    }
  }, CRITERIOS.map(([nome, nota], i) => /*#__PURE__*/React.createElement(CriterionPill, {
    key: nome,
    name: nome,
    score: nota,
    style: {
      animation: 'le-fade-in 0.4s var(--ease-standard) both',
      animationDelay: i * 35 + 'ms'
    }
  })))));
}
Object.assign(window, {
  EvolucaoTab
});
})(); } catch (e) { __ds_ns.__errors.push({ path: "ui_kits/portal-aluno/EvolucaoTab.jsx", error: String((e && e.message) || e) }); }

// ui_kits/portal-aluno/FinanceiroTab.jsx
try { (() => {
const {
  Card,
  Inset,
  Button,
  ProductCard
} = window.CapoeiraLiberdadeEExpressODesignSystem_5cc6bd;
const PRODUTOS = [{
  nome: 'Abadá Oficial',
  desc: 'Tecido leve, altamente resistente e bordado com o brasão oficial do grupo.',
  preco: 'R$ 90,00',
  img: 'https://images.unsplash.com/photo-1578632767115-351597cf2477?w=400'
}, {
  nome: 'Berimbau Profissional',
  desc: 'Verga de biriba selecionada, cabaça perfeitamente afinada e arame importado.',
  preco: 'R$ 220,00',
  img: 'https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?w=400'
}, {
  nome: 'Pandeiro Profissional',
  desc: 'Pele animal natural, tarraxas reforçadas e excelente projeção sonora.',
  preco: 'R$ 180,00',
  img: 'https://images.unsplash.com/photo-1543169174-ac58be27914f?w=400'
}];
function FinanceiroTab({
  onToast
}) {
  return /*#__PURE__*/React.createElement("div", {
    style: {
      animation: 'le-fade-in 0.4s var(--ease-standard)'
    }
  }, /*#__PURE__*/React.createElement(Card, {
    variant: "panel",
    style: {
      marginBottom: 25
    }
  }, /*#__PURE__*/React.createElement("h3", {
    style: {
      color: 'var(--blue-900)',
      marginBottom: 10
    }
  }, /*#__PURE__*/React.createElement("i", {
    className: "fas fa-file-invoice-dollar"
  }), " Mensalidade e Assinaturas"), /*#__PURE__*/React.createElement("p", {
    style: {
      color: 'var(--text-muted)',
      marginBottom: 15,
      fontSize: '0.95rem'
    }
  }, "Mantenha sua contribui\xE7\xE3o em dia para garantir total suporte nas rodas e eventos oficiais do grupo."), /*#__PURE__*/React.createElement(Inset, {
    style: {
      padding: 20,
      borderRadius: 14,
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'center',
      flexWrap: 'wrap',
      gap: 15
    }
  }, /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("strong", {
    style: {
      fontSize: '1.05rem',
      color: 'var(--blue-900)'
    }
  }, "Mensalidade Vigente - Plano Mensal"), /*#__PURE__*/React.createElement("p", {
    style: {
      color: 'var(--text-muted)',
      fontSize: '0.85rem',
      marginTop: 3
    }
  }, "Vencimento todo dia 10 de cada m\xEAs")), /*#__PURE__*/React.createElement(Button, {
    shape: "round",
    size: "lg",
    onClick: () => onToast('Gerando QR Code PIX para pagamento seguro…')
  }, "Pagar com PIX (R$ 50,00)"))), /*#__PURE__*/React.createElement("h3", {
    style: {
      color: 'var(--blue-900)',
      marginBottom: 15,
      fontFamily: 'var(--font-display)'
    }
  }, /*#__PURE__*/React.createElement("i", {
    className: "fas fa-store"
  }), " Loja Oficial Capoeira Liberdade"), /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'grid',
      gridTemplateColumns: 'repeat(auto-fill,minmax(280px,1fr))',
      gap: 20
    }
  }, PRODUTOS.map(p => /*#__PURE__*/React.createElement(ProductCard, {
    key: p.nome,
    name: p.nome,
    description: p.desc,
    price: p.preco,
    image: p.img,
    onBuy: () => onToast('Pedido de "' + p.nome + '" registrado! Redirecionando para o PIX.')
  }))));
}
Object.assign(window, {
  FinanceiroTab
});
})(); } catch (e) { __ds_ns.__errors.push({ path: "ui_kits/portal-aluno/FinanceiroTab.jsx", error: String((e && e.message) || e) }); }

// ui_kits/portal-aluno/LoginScreen.jsx
try { (() => {
const {
  Button,
  Input,
  Alert
} = window.CapoeiraLiberdadeEExpressODesignSystem_5cc6bd;
function LoginScreen({
  onEnter
}) {
  const [id, setId] = React.useState('');
  const [pw, setPw] = React.useState('');
  const [err, setErr] = React.useState(false);
  const submit = e => {
    e.preventDefault();
    if (!id || !pw) {
      setErr(true);
      return;
    }
    setErr(false);
    onEnter(id);
  };
  return /*#__PURE__*/React.createElement("div", {
    style: {
      background: 'var(--brand-gradient)',
      minHeight: '100vh',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: 20,
      position: 'relative',
      overflow: 'hidden'
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      position: 'absolute',
      borderRadius: '50%',
      filter: 'blur(60px)',
      opacity: 0.55,
      background: '#00E676',
      width: 300,
      height: 300,
      top: -60,
      left: -60,
      animation: 'le-float 7s var(--ease-float) infinite'
    }
  }), /*#__PURE__*/React.createElement("div", {
    style: {
      position: 'absolute',
      borderRadius: '50%',
      filter: 'blur(60px)',
      opacity: 0.55,
      background: '#389E92',
      width: 400,
      height: 400,
      bottom: -110,
      right: -60,
      animation: 'le-float 9s var(--ease-float) infinite reverse'
    }
  }), /*#__PURE__*/React.createElement("form", {
    onSubmit: submit,
    className: err ? 'shake' : '',
    style: {
      background: 'rgba(255,255,255,0.97)',
      padding: 40,
      borderRadius: 22,
      boxShadow: 'var(--shadow-auth)',
      width: '100%',
      maxWidth: 400,
      zIndex: 10,
      position: 'relative',
      animation: 'le-rise 0.7s var(--ease-standard)'
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      textAlign: 'center',
      marginBottom: 30
    }
  }, /*#__PURE__*/React.createElement("img", {
    src: "../../assets/logo-liberdade150.png",
    alt: "",
    style: {
      width: 84,
      marginBottom: 15,
      borderRadius: '50%',
      boxShadow: '0 6px 18px rgba(0,45,114,0.2)'
    }
  }), /*#__PURE__*/React.createElement("h2", {
    style: {
      color: 'var(--blue-900)',
      fontSize: '1.5rem'
    }
  }, "Portal Capoeira Liberdade"), /*#__PURE__*/React.createElement("p", {
    style: {
      color: 'var(--text-muted)',
      fontSize: '0.9rem',
      marginTop: 5
    }
  }, "Acesse com E-mail ou Celular e Senha")), err ? /*#__PURE__*/React.createElement("div", {
    style: {
      marginBottom: 15
    }
  }, /*#__PURE__*/React.createElement(Alert, null, "Credenciais incorretas.")) : null, /*#__PURE__*/React.createElement("div", {
    style: {
      marginBottom: 20
    }
  }, /*#__PURE__*/React.createElement(Input, {
    icon: "fas fa-user",
    placeholder: "E-mail ou Celular",
    value: id,
    onChange: e => setId(e.target.value)
  })), /*#__PURE__*/React.createElement("div", {
    style: {
      marginBottom: 20
    }
  }, /*#__PURE__*/React.createElement(Input, {
    icon: "fas fa-lock",
    type: "password",
    placeholder: "Sua Senha",
    value: pw,
    onChange: e => setPw(e.target.value)
  })), /*#__PURE__*/React.createElement(Button, {
    type: "submit",
    shape: "round",
    size: "lg",
    block: true,
    iconRight: "fas fa-arrow-right",
    style: {
      fontFamily: 'var(--font-display)'
    }
  }, "Acessar Painel"), /*#__PURE__*/React.createElement("div", {
    style: {
      textAlign: 'center',
      marginTop: 15,
      fontSize: '0.9rem'
    }
  }, "N\xE3o tem cadastro? ", /*#__PURE__*/React.createElement("a", {
    href: "../inscricao/index.html"
  }, "Inscreva-se aqui"))));
}
Object.assign(window, {
  LoginScreen
});
})(); } catch (e) { __ds_ns.__errors.push({ path: "ui_kits/portal-aluno/LoginScreen.jsx", error: String((e && e.message) || e) }); }

// ui_kits/portal-aluno/StudentPanel.jsx
try { (() => {
const {
  TopNav,
  NavItem,
  Button,
  Toast
} = window.CapoeiraLiberdadeEExpressODesignSystem_5cc6bd;
function StudentPanel({
  aluno,
  onLogout
}) {
  const [aba, setAba] = React.useState('evolucao');
  const [toasts, setToasts] = React.useState([]);
  const pushToast = msg => {
    const id = Date.now();
    setToasts(t => [...t, {
      id,
      msg
    }]);
    setTimeout(() => setToasts(t => t.filter(x => x.id !== id)), 3200);
  };
  return /*#__PURE__*/React.createElement("div", {
    style: {
      background: 'var(--surface-app)',
      minHeight: '100vh'
    }
  }, /*#__PURE__*/React.createElement(TopNav, {
    logoSrc: "../../assets/logo-liberdade150.png",
    title: "\xC1rea do Aluno",
    right: /*#__PURE__*/React.createElement(Button, {
      variant: "danger",
      shape: "pill",
      size: "sm",
      icon: "fas fa-sign-out-alt",
      onClick: onLogout
    }, "Sair")
  }, /*#__PURE__*/React.createElement(NavItem, {
    active: aba === 'evolucao',
    icon: "fas fa-chart-line",
    onClick: () => setAba('evolucao')
  }, "Minha Evolu\xE7\xE3o"), /*#__PURE__*/React.createElement(NavItem, {
    active: aba === 'financeiro',
    icon: "fas fa-wallet",
    onClick: () => setAba('financeiro')
  }, "Financeiro & Loja"), /*#__PURE__*/React.createElement(NavItem, {
    active: aba === 'aulas',
    icon: "fas fa-video",
    onClick: () => setAba('aulas')
  }, "Aulas & Hist\xF3ria")), /*#__PURE__*/React.createElement("div", {
    style: {
      maxWidth: 1250,
      margin: '30px auto',
      padding: '0 20px'
    }
  }, aba === 'evolucao' && /*#__PURE__*/React.createElement(EvolucaoTab, {
    aluno: aluno
  }), aba === 'financeiro' && /*#__PURE__*/React.createElement(FinanceiroTab, {
    onToast: pushToast
  }), aba === 'aulas' && /*#__PURE__*/React.createElement(AulasTab, {
    onToast: pushToast
  })), /*#__PURE__*/React.createElement("div", {
    style: {
      position: 'fixed',
      bottom: 20,
      right: 20,
      display: 'flex',
      flexDirection: 'column',
      gap: 10,
      zIndex: 1200
    }
  }, toasts.map(t => /*#__PURE__*/React.createElement(Toast, {
    key: t.id,
    tone: "success"
  }, t.msg))));
}
Object.assign(window, {
  StudentPanel
});
})(); } catch (e) { __ds_ns.__errors.push({ path: "ui_kits/portal-aluno/StudentPanel.jsx", error: String((e && e.message) || e) }); }

// ui_kits/portal-aluno/app.jsx
try { (() => {
function PortalApp() {
  const [logado, setLogado] = React.useState(false);
  const aluno = {
    nome: 'Ana Paula Ribeiro',
    academia: 'Mestre Profeta',
    cordao: 'Quilombola',
    foto: 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=300'
  };
  return logado ? /*#__PURE__*/React.createElement(StudentPanel, {
    aluno: aluno,
    onLogout: () => setLogado(false)
  }) : /*#__PURE__*/React.createElement(LoginScreen, {
    onEnter: () => setLogado(true)
  });
}
ReactDOM.createRoot(document.getElementById('root')).render(/*#__PURE__*/React.createElement(PortalApp, null));
})(); } catch (e) { __ds_ns.__errors.push({ path: "ui_kits/portal-aluno/app.jsx", error: String((e && e.message) || e) }); }

__ds_ns.AcademyCard = __ds_scope.AcademyCard;

__ds_ns.ChartBox = __ds_scope.ChartBox;

__ds_ns.CordaoBar = __ds_scope.CordaoBar;

__ds_ns.CriterionPill = __ds_scope.CriterionPill;

__ds_ns.LessonCard = __ds_scope.LessonCard;

__ds_ns.ProductCard = __ds_scope.ProductCard;

__ds_ns.ProfileBanner = __ds_scope.ProfileBanner;

__ds_ns.RuleBox = __ds_scope.RuleBox;

__ds_ns.StarRating = __ds_scope.StarRating;

__ds_ns.StudentCard = __ds_scope.StudentCard;

__ds_ns.TeacherBox = __ds_scope.TeacherBox;

__ds_ns.CORDOES_ADULTO = __ds_scope.CORDOES_ADULTO;

__ds_ns.CORDOES_KIDS = __ds_scope.CORDOES_KIDS;

__ds_ns.CRITERIOS = __ds_scope.CRITERIOS;

__ds_ns.Badge = __ds_scope.Badge;

__ds_ns.Button = __ds_scope.Button;

__ds_ns.Card = __ds_scope.Card;

__ds_ns.IconButton = __ds_scope.IconButton;

__ds_ns.Input = __ds_scope.Input;

__ds_ns.Inset = __ds_scope.Inset;

__ds_ns.SectionHeader = __ds_scope.SectionHeader;

__ds_ns.Select = __ds_scope.Select;

__ds_ns.Alert = __ds_scope.Alert;

__ds_ns.EmptyState = __ds_scope.EmptyState;

__ds_ns.Modal = __ds_scope.Modal;

__ds_ns.SkeletonCard = __ds_scope.SkeletonCard;

__ds_ns.Toast = __ds_scope.Toast;

__ds_ns.NavItem = __ds_scope.NavItem;

__ds_ns.StepIndicator = __ds_scope.StepIndicator;

__ds_ns.TopNav = __ds_scope.TopNav;

})();
