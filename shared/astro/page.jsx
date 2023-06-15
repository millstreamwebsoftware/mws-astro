// import { CloudCannonConnect } from '@cloudcannon/react-connector'

import { getComponent } from "src/util";

export default function Page({ contentBlocks }) {
  return (
    <main>
      {contentBlocks.map((block, i) => {
        // const Component = CloudCannonConnect(components[block._bookshop_name]);
        const Component = getComponent(block._bookshop_name);
        return <Component {...block} key={i} />;
      })}
    </main>
  );
}
