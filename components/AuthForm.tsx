
import React, { useState } from 'react';
import { auth, signInWithEmailAndPassword, createUserWithEmailAndPassword } from '../firebase';
import { LogIn, UserPlus, ShieldCheck, AlertCircle } from 'lucide-react';

interface AuthFormProps {
  theme?: 'light' | 'dark';
}

const AuthForm: React.FC<AuthFormProps> = ({ theme = 'light' }) => {
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      if (isLogin) {
        await signInWithEmailAndPassword(auth, email, password);
      } else {
        await createUserWithEmailAndPassword(auth, email, password);
      }
    } catch (err: any) {
      console.error(err);
      setError(err.message.includes('auth/invalid-credential') 
        ? 'Credenciais inválidas.' 
        : 'Erro técnico. Tente novamente mais tarde.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50 dark:bg-slate-950 p-6 transition-colors duration-300">
      <div className="w-full max-w-md bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl shadow-2xl overflow-hidden">
        <div className="bg-slate-900 dark:bg-blue-600 p-10 text-center">
          <div className="w-14 h-14 bg-white dark:bg-slate-900 rounded-2xl mx-auto flex items-center justify-center font-black text-slate-900 dark:text-white text-xl mb-6 shadow-xl">MF</div>
          <h2 className="text-white text-sm font-black uppercase tracking-[0.4em]">Master Finance</h2>
          <p className="text-slate-400 dark:text-blue-100 text-[10px] mt-3 font-bold uppercase tracking-widest opacity-80">
            {isLogin ? 'Painel de Acesso Autorizado' : 'Início de Credenciamento'}
          </p>
        </div>
        
        <form onSubmit={handleSubmit} className="p-10 space-y-6">
          {error && (
            <div className="bg-rose-50 dark:bg-rose-500/10 border border-rose-100 dark:border-rose-500/20 p-4 rounded-xl flex items-center gap-3 text-rose-600 dark:text-rose-400 text-[10px] font-black uppercase tracking-tight">
              <AlertCircle size={16} /> {error}
            </div>
          )}

          <div className="space-y-2">
            <label className="text-[9px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest block">Identificador E-mail</label>
            <input 
              type="email" 
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-5 py-4 text-xs font-bold outline-none focus:ring-2 focus:ring-slate-900 dark:focus:ring-blue-500 dark:text-white transition-all"
              placeholder="ex: admin@master.finance"
            />
          </div>

          <div className="space-y-2">
            <label className="text-[9px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest block">Chave de Segurança</label>
            <input 
              type="password" 
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-5 py-4 text-xs font-bold outline-none focus:ring-2 focus:ring-slate-900 dark:focus:ring-blue-500 dark:text-white transition-all"
              placeholder="••••••••"
            />
          </div>

          <button 
            type="submit" 
            disabled={loading}
            className="w-full bg-slate-900 dark:bg-blue-600 text-white font-black py-5 rounded-2xl text-[10px] uppercase tracking-[0.3em] hover:bg-slate-800 dark:hover:bg-blue-500 active:scale-[0.98] transition-all flex items-center justify-center gap-3 disabled:bg-slate-200 dark:disabled:bg-slate-800 shadow-xl shadow-slate-900/10 dark:shadow-blue-600/20"
          >
            {loading ? 'Validando...' : (
              <>
                {isLogin ? <LogIn size={18} /> : <UserPlus size={18} />}
                {isLogin ? 'Autenticar Sistema' : 'Criar Registro'}
              </>
            )}
          </button>

          <div className="pt-6 text-center">
            <button 
              type="button"
              onClick={() => setIsLogin(!isLogin)}
              className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest hover:text-slate-900 dark:hover:text-white transition-colors"
            >
              {isLogin ? 'Não possui acesso? Solicitar Registro' : 'Já possui credenciais? Voltar ao Login'}
            </button>
          </div>
        </form>
        
        <div className="bg-slate-50 dark:bg-slate-800/50 p-5 flex items-center justify-center gap-3 border-t border-slate-100 dark:border-slate-800">
           <ShieldCheck size={14} className="text-emerald-500" />
           <span className="text-[9px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest">Protocolo de Criptografia Ativo</span>
        </div>
      </div>
    </div>
  );
};

export default AuthForm;
