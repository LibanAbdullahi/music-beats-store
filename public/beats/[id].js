// pages/beats/[id].js

import { useRouter } from "next/router";

const Beat = () => {
  const router = useRouter();
  const { id } = router.query;

  return <div>Beat {id}</div>;
};

export default Beat;
