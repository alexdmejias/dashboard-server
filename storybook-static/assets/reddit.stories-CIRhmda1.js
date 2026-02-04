import{c as i}from"./liquidRenderer-CuHwAorp.js";import"./liquid.browser-BFFRvSvB.js";const l=`<div class="layout layout--row">
  <div class="flex flex--col flex--center bg--white p--2.5 rounded--small text--center w-75">
    {% assign items = data.data | default: data %}
    <span class="title">{{ data.title | default: runtimeConfig.title }}</span>
    {% if items and items.size > 0 %}
      {% for item in items %}
        <div class="item">
          <div class="meta"></div>
          <div class="content text--left">
            <span class="title">{{ item.title }}</span>
          </div>
        </div>
      {% endfor %}
    {% endif %}
  </div>
</div>
`,p={title:"Reddit",render:i(l)},t={default:{title:"Reddit Posts",data:[{title:"TIL that octopuses have three hearts"},{title:"New TypeScript 5.0 features announced"},{title:"How to optimize React performance"}]},empty:[],singlePost:{title:"Reddit Posts",data:[{title:"Single post example"}]},longTitles:{title:"Reddit Posts with Long Titles",data:[{title:"This is an extremely long post title that goes on and on with lots of information and detail that might cause layout issues if not handled properly in the template"},{title:"Another very long title with even more content to test how the UI handles text wrapping and spacing when titles are particularly verbose and detailed"},{title:"Short title for contrast"}]},manyPosts:{data:Array.from({length:15},(d,o)=>({title:`Reddit post number ${o+1} about various interesting topics`}))}},e={args:{data:t.default}},a={args:{data:t.empty}},s={args:{data:t.singlePost}},r={args:{data:t.longTitles}},n={args:{data:t.manyPosts}};e.parameters={...e.parameters,docs:{...e.parameters?.docs,source:{originalSource:`{
  args: {
    data: fixtures.default
  }
}`,...e.parameters?.docs?.source}}};a.parameters={...a.parameters,docs:{...a.parameters?.docs,source:{originalSource:`{
  args: {
    data: fixtures.empty
  }
}`,...a.parameters?.docs?.source}}};s.parameters={...s.parameters,docs:{...s.parameters?.docs,source:{originalSource:`{
  args: {
    data: fixtures.singlePost
  }
}`,...s.parameters?.docs?.source}}};r.parameters={...r.parameters,docs:{...r.parameters?.docs,source:{originalSource:`{
  args: {
    data: fixtures.longTitles
  }
}`,...r.parameters?.docs?.source}}};n.parameters={...n.parameters,docs:{...n.parameters?.docs,source:{originalSource:`{
  args: {
    data: fixtures.manyPosts
  }
}`,...n.parameters?.docs?.source}}};const u=["Default","Empty","SinglePost","LongTitles","ManyPosts"];export{e as Default,a as Empty,r as LongTitles,n as ManyPosts,s as SinglePost,u as __namedExportsOrder,p as default};
