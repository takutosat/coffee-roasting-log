// src/App.tsx

import AppLayout from './components/layout/AppLayout';

function App() {
  return (
    <AppLayout>
      <div className="text-center py-10">
        <h2 className="text-4xl font-extrabold text-gray-900 mb-4">
          Welcome to Your Roast Log!
        </h2>
        <p className="text-lg text-gray-600">
          Let's start logging your coffee roasting journey.
        </p>
      </div>
    </AppLayout>
  );
}

export default App;