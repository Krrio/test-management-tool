import "@/app/home.css";
import { Companies } from "../socialproof";

const Features = () => {
  return (
    <main className="relative h-[calc(100vh-4rem)] w-full overflow-hidden bg-black">
      <div className="mt-10">
        <Companies />
      </div>
    </main>
  )
}

export default Features