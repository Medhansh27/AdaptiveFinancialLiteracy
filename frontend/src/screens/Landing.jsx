export default function Landing() {
  return (
    <div className="h-screen flex flex-col justify-center items-center bg-gradient-to-br from-indigo-500 to-purple-600 text-white">

      <h1 className="text-4xl font-bold mb-4">
        💰 FinSim
      </h1>

      <p className="mb-6 text-lg">
        Learn finance by making real decisions
      </p>

      <button
        className="bg-white text-black px-6 py-2 rounded-lg"
        onClick={() => {
          setTimeout(() => {
            window.location.href = "/login";
          }, 300);
        }}
      >
        Start
      </button>

    </div>
  );
}
