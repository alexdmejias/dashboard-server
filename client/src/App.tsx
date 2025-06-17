import {
  createEffect,
  createResource,
  createSignal,
  onMount,
  type Component,
} from "solid-js";

const App: Component = () => {
  const [data, setData] = createSignal(null);

  createEffect(() => {
    data(); // will run every time data changes
    console.log("$$$$$$$$", data());
  });

  onMount(async () => {
    const fetchedData = await fetch("http://localhost:5656/health");
    const jsonData = await fetchedData.json();
    console.log("########", jsonData);
    setData(jsonData);
  });

  console.log("@@@@@@@@", data());
  return <pre>{JSON.stringify(data(), null, 2)}</pre>;
};

export default App;
