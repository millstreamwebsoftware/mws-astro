// import { CloudCannonConnect } from '@cloudcannon/react-connector'

import { getComponents } from "src/util";
const components = getComponents();

export default function Page({ contentBlocks }) {
  return (
    <main>
      {contentBlocks.map((block, i) => {
        // const Component = CloudCannonConnect(components[block._bookshop_name]);
        const Component = components[block._bookshop_name];
        return <Component {...block} key={i} />;
      })}
    </main>
  );
}
