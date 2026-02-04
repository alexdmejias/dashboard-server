import{c as r}from"./liquidRenderer-CuHwAorp.js";import"./liquid.browser-BFFRvSvB.js";const d=`<div class="layout layout--col p--8">
  <span class="title">{{ runtimeConfig.title | default: data.title | default: "Todoist" }}</span>
  <div class="columns">
    {% assign sectionGroups = data.sections | default: data %}
    {% assign hasItems = false %}
    {% for section in sectionGroups %}
      {% if section.items and section.items.size > 0 %}
        {% assign hasItems = true %}
        <div class="column gap p--2.5 bg--gray-10 rounded--medium text--center">
          <span class="label text-stroke">{{section.name}}</span>
          {% for item in section.items %}
            <div class="flex flex--center p--2.5 rounded--small bg--white w--full">
                <span class="label">{{ item.content }}</span>
            </div>
          {% endfor %}
        </div>
      {% endif %}
    {% endfor %}
    {% unless hasItems %}
      <div class="empty">No tasks</div>
    {% endunless %}
  </div>
</div>
`,p={title:"Todoist",render:r(d)},e={default:{sections:[{key:"123",name:"Today",items:[{id:"1",content:"Review pull requests",section_id:"123"},{id:"2",content:"Update documentation",section_id:"123"},{id:"3",content:"Team standup at 10am",section_id:"123"}]}]},empty:{sections:[{key:"123",name:"Today",items:[]}]},multipleSections:{sections:[{key:"123",name:"Work",items:[{id:"1",content:"Deploy to production",section_id:"123"},{id:"2",content:"Code review",section_id:"123"}]},{key:"456",name:"Personal",items:[{id:"3",content:"Buy groceries",section_id:"456"},{id:"4",content:"Call dentist",section_id:"456"}]},{key:"789",name:"Learning",items:[{id:"5",content:"Read TypeScript docs",section_id:"789"}]}]},longTitles:{sections:[{key:"123",name:"Today",items:[{id:"1",content:"This is a really long task name that might wrap to multiple lines and we need to see how it displays",section_id:"123"},{id:"2",content:"Another extremely long task with detailed information about what needs to be done including multiple steps",section_id:"123"}]}]},stressTest:{sections:[{key:"123",name:"Today",items:Array.from({length:20},(c,i)=>({id:`${i+1}`,content:`Task ${i+1}: Do something important`,section_id:"123"}))}]}},t={args:{data:e.default}},s={args:{data:e.empty}},n={args:{data:e.multipleSections}},a={args:{data:e.longTitles}},o={args:{data:e.stressTest}};t.parameters={...t.parameters,docs:{...t.parameters?.docs,source:{originalSource:`{
  args: {
    data: fixtures.default
  }
}`,...t.parameters?.docs?.source}}};s.parameters={...s.parameters,docs:{...s.parameters?.docs,source:{originalSource:`{
  args: {
    data: fixtures.empty
  }
}`,...s.parameters?.docs?.source}}};n.parameters={...n.parameters,docs:{...n.parameters?.docs,source:{originalSource:`{
  args: {
    data: fixtures.multipleSections
  }
}`,...n.parameters?.docs?.source}}};a.parameters={...a.parameters,docs:{...a.parameters?.docs,source:{originalSource:`{
  args: {
    data: fixtures.longTitles
  }
}`,...a.parameters?.docs?.source}}};o.parameters={...o.parameters,docs:{...o.parameters?.docs,source:{originalSource:`{
  args: {
    data: fixtures.stressTest
  }
}`,...o.parameters?.docs?.source}}};const u=["Default","EmptyState","MultipleSections","LongTitles","StressTest"];export{t as Default,s as EmptyState,a as LongTitles,n as MultipleSections,o as StressTest,u as __namedExportsOrder,p as default};
