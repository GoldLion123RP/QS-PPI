import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'System Status',
};

export default function StatusPage() {
  return (
    <div className="min-h-screen bg-gray-900">
      <div className="relative z-10">
        <div className="max-w-4xl mx-auto p-8">
          <h1 className="text-4xl font-bold text-center mb-8 bg-gradient-to-r from-teal-400 to-cyan-400 bg-clip-text text-transparent">
            System Status
          </h1>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
            <div className="bg-white/5 backdrop-blur-sm border border-white/10 rounded-xl p-6 text-center">
              <div className="text-sm text-gray-400 uppercase tracking-wider mb-2">
                Backend Status
              </div>
              <div className="text-2xl font-mono font-semibold text-green-400">
                ● ONLINE
              </div>
            </div>
            
            <div className="bg-white/5 backdrop-blur-sm border border-white/10 rounded-xl p-6 text-center">
              <div className="text-sm text-gray-400 uppercase tracking-wider mb-2">
                Artifacts Ready
              </div>
              <div className="text-2xl font-mono font-semibold text-green-400">
                ✅ YES
              </div>
            </div>
            
            <div className="bg-white/5 backdrop-blur-sm border border-white/10 rounded-xl p-6 text-center">
              <div className="text-sm text-gray-400 uppercase tracking-wider mb-2">
                Node Version
              </div>
              <div className="text-2xl font-mono font-semibold">
                v20.x
              </div>
            </div>
            
            <div className="bg-white/5 backdrop-blur-sm border border-white/10 rounded-xl p-6 text-center">
              <div className="text-sm text-gray-400 uppercase tracking-wider mb-2">
                Uptime
              </div>
              <div className="text-2xl font-mono font-semibold">
                99.9%
              </div>
            </div>
          </div>
          
          <div className="bg-white/5 backdrop-blur-sm border border-white/10 rounded-xl p-6">
            <h2 className="text-xl font-semibold mb-4">API Endpoints</h2>
            <table className="w-full">
              <thead>
                <tr className="text-left text-gray-400 text-sm">
                  <th className="pb-3">Method</th>
                  <th className="pb-3">Endpoint</th>
                  <th className="pb-3">Description</th>
                </tr>
              </thead>
              <tbody className="text-sm">
                <tr className="border-t border-white/10">
                  <td className="py-3"><span className="bg-green-500/20 text-green-400 px-2 py-1 rounded text-xs font-mono">POST</span></td>
                  <td className="py-3 font-mono">/api/prove</td>
                  <td className="py-3 text-gray-400">Generate ZKP income proof</td>
                </tr>
                <tr className="border-t border-white/10">
                  <td className="py-3"><span className="bg-green-500/20 text-green-400 px-2 py-1 rounded text-xs font-mono">POST</span></td>
                  <td className="py-3 font-mono">/api/verify</td>
                  <td className="py-3 text-gray-400">Verify a proof</td>
                </tr>
                <tr className="border-t border-white/10">
                  <td className="py-3"><span className="bg-cyan-500/20 text-cyan-400 px-2 py-1 rounded text-xs font-mono">GET</span></td>
                  <td className="py-3 font-mono">/api/pq</td>
                  <td className="py-3 text-gray-400">ML-DSA key pair demo</td>
                </tr>
                <tr className="border-t border-white/10">
                  <td className="py-3"><span className="bg-cyan-500/20 text-cyan-400 px-2 py-1 rounded text-xs font-mono">GET</span></td>
                  <td className="py-3 font-mono">/api/status</td>
                  <td className="py-3 text-gray-400">System status</td>
                </tr>
              </tbody>
            </table>
          </div>
          
          <div className="mt-8 text-center">
            <button className="bg-gradient-to-r from-teal-500 to-cyan-500 hover:from-teal-400 hover:to-cyan-400 text-white font-semibold py-3 px-8 rounded-lg transition-all transform hover:scale-105">
              🔄 Refresh Status
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
