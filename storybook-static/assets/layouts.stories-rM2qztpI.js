import{L as x}from"./liquid.browser-BFFRvSvB.js";import{w as f}from"./template-fR4a284P.js";import{c as v}from"./template-BAxAucrk.js";const b=`<div class="layout layout--row">
  <section class="flex flex--col">
    <h1 class="title">{{ data.date }}</h1>
    <div class="flex flex--col">
      {% assign classes = "rounded--xsmall w--6 h--6" %}
      {% for month in data.days %}
      <div class="month inline-flex">
        {% for i in (1..month[0]) %}
        <div class="bg--gray-10 {{classes}}"></div>
        {% endfor %}
        {% for i in (1..month[1]) %}
        <div class="{{classes}}"></div>
        {% endfor %}
      </div>
      {% endfor %}
    </div>
  </section>
</div>
<style>
  .month div {
    --size: 25px;
    width: var(--size);
    height: var(--size);
    border: 2px solid black;
  }
</style>
`,F=`<!DOCTYPE html>
<html lang="en">

<head>
  <meta charset="UTF-8">
  <meta http-equiv="X-UA-Compatible" content="IE=edge">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <link rel="stylesheet" href="https://usetrmnl.com/css/latest/plugins.css">
  <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/bootstrap@5.3.8/dist/css/bootstrap-utilities.min.css">

  <style>
    .trmnl .screen--inkplate_10 {
      --screen-w: 1200px;
      --screen-h: 825px;
      --screen-w-original: 1200px;
      --screen-h-original: 825px;
      --title-font-size: 30px
    }

    .trmnl .screen--2bit .item .meta {
      background-image: url("https://usetrmnl.com/images/grayscale--2bit/gray-10.png");
    }
    .screen {
      border: 1px solid tomato;
    }
  </style>
  <title>Document</title>
</head>

<body>
<div class="trmnl">
  <div class="screen screen--2bit screen--inkplate_10 screen--md screen--landscape screen--1x">
    <div class="view view--full">
{{ content }}
<div class="title_bar">
  <span class="title">Title</span>
  <span class="instance">Instance</span>
</div>
</div>
</div>
</div>
</body>
</html>
`,S=`<!DOCTYPE html>
<html lang="en">

<head>
  <meta charset="UTF-8">
  <meta http-equiv="X-UA-Compatible" content="IE=edge">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <link rel="stylesheet" href="https://usetrmnl.com/css/latest/plugins.css">
  <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/bootstrap@5.3.8/dist/css/bootstrap-utilities.min.css">

  <style>
    .trmnl .screen--inkplate_10 {
      --screen-w: 1200px;
      --screen-h: 825px;
      --screen-w-original: 1200px;
      --screen-h-original: 825px;
      --title-font-size: 30px
    }

    .trmnl .screen--2bit .item .meta {
      background-image: url("https://usetrmnl.com/images/grayscale--2bit/gray-10.png");
    }
    .screen {
      border: 1px solid tomato;
    }
    .split-container {
      display: flex;
      gap: 20px;
      height: 100%;
    }
    .split-container > div {
      flex: 1;
    }
  </style>
  <title>Document</title>
</head>

<body>
<div class="trmnl">
  <div class="screen screen--2bit screen--inkplate_10 screen--md screen--landscape screen--1x">
    <div class="view view--full">
<div class="split-container">
{{ content }}
</div>
<div class="title_bar">
  <span class="title">Title</span>
  <span class="instance">Instance</span>
</div>
</div>
</div>
</div>
</body>
</html>
`,y=new x,P={"year-progress":b,weather:f,calendar:v};function m(a,t){const e=P[a];if(!e)throw new Error(`Template not found for callback: ${a}`);return y.parseAndRenderSync(e,{data:t})}function n(a,t){return()=>{try{if(a==="full"){if(t.length!==1)throw new Error("Full layout requires exactly 1 callback");const e=m(t[0].name,t[0].data);return y.parseAndRenderSync(F,{content:e})}else{if(t.length!==2)throw new Error("Split layout requires exactly 2 callbacks");const e=m(t[0].name,t[0].data),g=m(t[1].name,t[1].data),w=`<div>${e}</div>
<div>${g}</div>`;return y.parseAndRenderSync(S,{content:w})}}catch(e){return console.error("Error rendering layout:",e),`<div style="color: red; padding: 20px;">Error rendering layout: ${e instanceof Error?e.message:String(e)}</div>`}}}const p={date:"Tue, Feb 4, 2026",days:[[31,0],[4,24],[0,31],[0,30],[0,31],[0,30],[0,31],[0,31],[0,30],[0,31],[0,30],[0,31]]},u={today:{max:27.9,low:10.2,date:"2/4/2026",current:21.9,condition:{text:"Partly cloudy",image:"https://cdn.weatherapi.com/weather/64x64/night/116.png"}},forecast:[{max:23.5,low:2.1,date:"Wed Feb 5",condition:{text:"Sunny",image:"https://cdn.weatherapi.com/weather/64x64/day/113.png"}},{max:23.2,low:10.6,date:"Thu Feb 6",condition:{text:"Partly Cloudy",image:"https://cdn.weatherapi.com/weather/64x64/day/116.png"}},{max:25.1,low:12.3,date:"Fri Feb 7",condition:{text:"Overcast",image:"https://cdn.weatherapi.com/weather/64x64/day/122.png"}}]},k={today:{max:18.3,low:12.1,date:"2/4/2026",current:15.6,condition:{text:"Foggy",image:"https://cdn.weatherapi.com/weather/64x64/day/248.png"}},forecast:[{max:19.4,low:11.7,date:"Wed Feb 5",condition:{text:"Partly cloudy",image:"https://cdn.weatherapi.com/weather/64x64/day/116.png"}},{max:17.8,low:10.9,date:"Thu Feb 6",condition:{text:"Cloudy",image:"https://cdn.weatherapi.com/weather/64x64/day/119.png"}}]},C={today:{max:5.6,low:-2.1,date:"2/4/2026",current:2.3,condition:{text:"Light snow",image:"https://cdn.weatherapi.com/weather/64x64/day/326.png"}},forecast:[{max:4.2,low:-3.8,date:"Wed Feb 5",condition:{text:"Sunny",image:"https://cdn.weatherapi.com/weather/64x64/day/113.png"}},{max:6.1,low:-1.2,date:"Thu Feb 6",condition:{text:"Partly Cloudy",image:"https://cdn.weatherapi.com/weather/64x64/day/116.png"}}]},h={title:"Calendar",days:[{date:"Tue 2/4",events:[{title:"Team Standup",time:"9:00 AM",category:"morning"},{title:"Code Review",time:"2:00 PM",category:"afternoon"}],eventsByCategory:{allDay:[],morning:[{title:"Team Standup",time:"9:00 AM"}],afternoon:[{title:"Code Review",time:"2:00 PM"}],evening:[],night:[]}},{date:"Wed 2/5",events:[{title:"All Hands Meeting",time:"10:00 AM",category:"morning"},{title:"Sprint Planning",time:"3:00 PM",category:"afternoon"}],eventsByCategory:{allDay:[],morning:[{title:"All Hands Meeting",time:"10:00 AM"}],afternoon:[{title:"Sprint Planning",time:"3:00 PM"}],evening:[],night:[]}},{date:"Thu 2/6",events:[{title:"1:1 with Manager",time:"11:00 AM",category:"morning"}],eventsByCategory:{allDay:[],morning:[{title:"1:1 with Manager",time:"11:00 AM"}],afternoon:[],evening:[],night:[]}}]},M={title:"Layouts/Full Layout",parameters:{layout:"fullscreen",docs:{description:{component:"Full-page layout for displaying a single callback"}}}},r={render:n("full",[{name:"year-progress",data:p}]),parameters:{docs:{description:{story:"Full layout with year progress callback showing the current year's progress"}}}},s={render:n("full",[{name:"weather",data:u}]),parameters:{docs:{description:{story:"Full layout with weather callback showing current conditions and forecast"}}}},o={render:n("full",[{name:"calendar",data:h}]),parameters:{docs:{description:{story:"Full layout with calendar callback showing upcoming events"}}}},R={title:"Layouts/Split Layout",parameters:{layout:"fullscreen",docs:{description:{component:"Side-by-side layout for displaying two callbacks"}}}},i={render:n("split",[{name:"year-progress",data:p},{name:"weather",data:u}]),parameters:{docs:{description:{story:"Split layout combining year progress and weather - showing time progress alongside weather forecast"}}}},c={render:n("split",[{name:"weather",data:k},{name:"weather",data:C}]),parameters:{docs:{description:{story:"Split layout comparing weather in two different cities (San Francisco and New York)"}}}},l={render:n("split",[{name:"weather",data:u},{name:"calendar",data:h}]),parameters:{docs:{description:{story:"Split layout combining weather forecast with calendar events - a typical dashboard view"}}}},d={render:n("split",[{name:"year-progress",data:p},{name:"year-progress",data:p}]),parameters:{docs:{description:{story:"Split layout with two year progress callbacks - useful for comparing different time periods or tracking systems"}}}};r.parameters={...r.parameters,docs:{...r.parameters?.docs,source:{originalSource:`{
  render: createLayoutStoryRenderer("full", [{
    name: "year-progress",
    data: yearProgressFixture
  }]),
  parameters: {
    docs: {
      description: {
        story: "Full layout with year progress callback showing the current year's progress"
      }
    }
  }
}`,...r.parameters?.docs?.source}}};s.parameters={...s.parameters,docs:{...s.parameters?.docs,source:{originalSource:`{
  render: createLayoutStoryRenderer("full", [{
    name: "weather",
    data: weatherFixture
  }]),
  parameters: {
    docs: {
      description: {
        story: "Full layout with weather callback showing current conditions and forecast"
      }
    }
  }
}`,...s.parameters?.docs?.source}}};o.parameters={...o.parameters,docs:{...o.parameters?.docs,source:{originalSource:`{
  render: createLayoutStoryRenderer("full", [{
    name: "calendar",
    data: calendarFixture
  }]),
  parameters: {
    docs: {
      description: {
        story: "Full layout with calendar callback showing upcoming events"
      }
    }
  }
}`,...o.parameters?.docs?.source}}};i.parameters={...i.parameters,docs:{...i.parameters?.docs,source:{originalSource:`{
  render: createLayoutStoryRenderer("split", [{
    name: "year-progress",
    data: yearProgressFixture
  }, {
    name: "weather",
    data: weatherFixture
  }]),
  parameters: {
    docs: {
      description: {
        story: "Split layout combining year progress and weather - showing time progress alongside weather forecast"
      }
    }
  }
}`,...i.parameters?.docs?.source}}};c.parameters={...c.parameters,docs:{...c.parameters?.docs,source:{originalSource:`{
  render: createLayoutStoryRenderer("split", [{
    name: "weather",
    data: weatherFixtureSF
  }, {
    name: "weather",
    data: weatherFixtureNY
  }]),
  parameters: {
    docs: {
      description: {
        story: "Split layout comparing weather in two different cities (San Francisco and New York)"
      }
    }
  }
}`,...c.parameters?.docs?.source}}};l.parameters={...l.parameters,docs:{...l.parameters?.docs,source:{originalSource:`{
  render: createLayoutStoryRenderer("split", [{
    name: "weather",
    data: weatherFixture
  }, {
    name: "calendar",
    data: calendarFixture
  }]),
  parameters: {
    docs: {
      description: {
        story: "Split layout combining weather forecast with calendar events - a typical dashboard view"
      }
    }
  }
}`,...l.parameters?.docs?.source}}};d.parameters={...d.parameters,docs:{...d.parameters?.docs,source:{originalSource:`{
  render: createLayoutStoryRenderer("split", [{
    name: "year-progress",
    data: yearProgressFixture
  }, {
    name: "year-progress",
    data: yearProgressFixture
  }]),
  parameters: {
    docs: {
      description: {
        story: "Split layout with two year progress callbacks - useful for comparing different time periods or tracking systems"
      }
    }
  }
}`,...d.parameters?.docs?.source}}};const W=["YearProgress","Weather","Calendar","splitLayoutMeta","YearProgressAndWeather","WeatherComparison","WeatherAndCalendar","DualYearProgress"];export{o as Calendar,d as DualYearProgress,s as Weather,l as WeatherAndCalendar,c as WeatherComparison,r as YearProgress,i as YearProgressAndWeather,W as __namedExportsOrder,M as default,R as splitLayoutMeta};
