
import React, { useState } from 'react';
import { auth, signInWithEmailAndPassword, createUserWithEmailAndPassword } from '../firebase';
import { LogIn, UserPlus, ShieldCheck, AlertCircle } from 'lucide-react';

const AuthForm: React.FC = () => {
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
        ? 'E-mail ou senha incorretos.' 
        : 'Ocorreu um erro. Tente novamente.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50 p-6">
      <div className="w-full max-w-md bg-white border border-slate-200 rounded-2xl shadow-xl overflow-hidden">
        <div className="bg-slate-900 p-8 text-center">
          <div className="w-12 h-12 bg-white rounded-xl mx-auto flex items-center justify-center font-black text-slate-900 text-lg mb-4 shadow-lg">MF</div>
          <h2 className="text-white text-xs font-black uppercase tracking-[0.3em]">Master Finance</h2>
          <p className="text-slate-400 text-[10px] mt-2 font-bold uppercase tracking-widest">
            {isLogin ? 'Bem-vindo de volta' : 'Crie sua conta profissional'}
          </p>
        </div>
        
        <form onSubmit={handleSubmit} className="p-8 space-y-5">
          {error && (
            <div className="bg-rose-50 border border-rose-100 p-3 rounded-lg flex items-center gap-2 text-rose-600 text-[10px] font-bold uppercase">
              <AlertCircle size={14} /> {error}
            </div>
          )}

          <div>
            <label className="text-[9px] font-black text-slate-400 uppercase mb-2 block tracking-widest">E-mail</label>
            <input 
              type="email" 
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full bg-slate-50 border border-slate-200 rounded-lg px-4 py-3 text-xs font-bold outline-none focus:border-slate-900 transition-colors"
              placeholder="seu@email.com"
            />
          </div>

          <div>
            <label className="text-[9px] font-black text-slate-400 uppercase mb-2 block tracking-widest">Senha</label>
            <input 
              type="password" 
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full bg-slate-50 border border-slate-200 rounded-lg px-4 py-3 text-xs font-bold outline-none focus:border-slate-900 transition-colors"
              placeholder="••••••••"
            />
          </div>

          <button 
            type="submit" 
            disabled={loading}
            className="w-full bg-slate-900 text-white font-black py-4 rounded-xl text-[10px] uppercase tracking-widest hover:bg-slate-800 active:scale-[0.98] transition-all flex items-center justify-center gap-2 disabled:bg-slate-200"
          >
            {loading ? 'Processando...' : (
              <>
                {isLogin ? <LogIn size={14} /> : <UserPlus size={14} />}
                {isLogin ? 'Entrar no Sistema' : 'Finalizar Cadastro'}
              </>
            )}
          </button>

          <div className="pt-4 text-center">
            <button 
              type="button"
              onClick={() => setIsLogin(!isLogin)}
              className="text-[9px] font-black text-slate-400 uppercase tracking-widest hover:text-slate-900 transition-colors"
            >
              {isLogin ? 'Não tem conta? Registre-se' : 'Já tem conta? Faça Login'}
            </button>
          </div>
        </form>
        
        <div className="bg-slate-50 p-4 flex items-center justify-center gap-2 border-t border-slate-100">
           <ShieldCheck size={12} className="text-emerald-500" />
           <span className="text-[8px] font-black text-slate-400 uppercase tracking-widest">Conexão Segura e Criptografada</span>
        </div>
      </div>
    </div>
  );
};

export default AuthForm;
