const n=`<div class="layout layout--row">
  <div class="flex flex--col w--full p--2 gap--small">
    <span class="title">{{ data.title | default: runtimeConfig.title }}</span>

    <div class="grid grid--cols-7 gap--xsmall h--min-64">
      {% for day in data.days %}
      <div class="calendar-day ">
        <div class="day-header p--1 text--center rounded--xsmall mb--2 bg-black">
          <span class="label label--inverted">{{ day.date }}</span>
        </div>

        <div class="day-events flex flex--col gap--xsmall h--full rounded-b--xsmall p--xsmall">
          {% assign categories = "allDay:All Day:false|morning:Morning:true|afternoon:Afternoon:true|evening:Evening:true|night:Night:true" | split: "|" %}
          {% for category in categories %}
            {% assign parts = category | split: ":" %}
            {% assign categoryKey = parts[0] %}
            {% assign categoryLabel = parts[1] %}
            {% assign showTimes = parts[2] %}
            {% assign events = day.eventsByCategory[categoryKey] %}

            <div class="event-category p--xsmall">
              <div class="mb--xsmall WASD">
                <span class="label label--xsmall label--muted gray-35">{{ categoryLabel }}</span>
              </div>
              {% if events and events.size > 0 %}
                {% for event in events %}
                  <div class="item mb--xsmall p--1">
                    <div class="content text--center">
                      <span class="label label--base label--inverted p-1">{{event.title}}
                        {% if showTimes == "true" %}
                          {{ event.start }} - {{ event.end }}
                        {% endif %}
                      </span>
                    </div>
                  </div>
                {% endfor %}
              {% endif %}
            </div>
          {% endfor %}
        </div>
      </div>
      {% endfor %}
    </div>
  </div>
</div>
<style>
  .day-events {
    border: 1px dashed black;
    border-top: 0;
    padding-top: 30px;
    margin-top: -25px;
  }

  .event-category {
    min-height: 40px;
    border-bottom: 1px solid #eee;
  }

  .event-category:last-child {
    border-bottom: none;
  }
  .WASD {
    text-align: center;
  }

  .content {
    display: flex;
    align-items: center;
    background-color: black;
    color: white;
  }
</style>
`;export{n as c};
