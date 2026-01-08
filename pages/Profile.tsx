import React, { useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../supabase.ts';
import { User } from '../types.ts';

interface ProfileProps {
    user: User;
    onUpdate?: () => Promise<void>;
    onLogout?: () => void;
}

const Profile: React.FC<ProfileProps> = ({ user, onUpdate, onLogout }) => {
    const navigate = useNavigate();
    const [name, setName] = useState(user.name);
    const [avatarUrl, setAvatarUrl] = useState(user.avatar || '');
    const [posX, setPosX] = useState(user.avatar_pos_x ?? 50);
    const [posY, setPosY] = useState(user.avatar_pos_y ?? 50);
    const [zoom, setZoom] = useState(user.avatar_zoom ?? 100);
    const [loading, setLoading] = useState(false);
    const [uploading, setUploading] = useState(false);
    const [deleting, setDeleting] = useState(false);
    const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
    const [message, setMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);

    const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        try {
            setUploading(true);
            setMessage(null);
            console.log('Iniciando upload...', file.name);

            const fileExt = file.name.split('.').pop();
            const fileName = `${user.id}-${Date.now()}.${fileExt}`;
            const filePath = `${fileName}`;

            console.log('Caminho do arquivo:', filePath);

            const { error: uploadError, data } = await supabase.storage
                .from('avatars')
                .upload(filePath, file, {
                    cacheControl: '3600',
                    upsert: false
                });

            if (uploadError) {
                console.error('Erro no upload do Supabase:', uploadError);
                throw uploadError;
            }

            console.log('Upload concluído com sucesso:', data);

            const { data: { publicUrl } } = supabase.storage
                .from('avatars')
                .getPublicUrl(filePath);

            console.log('URL pública gerada:', publicUrl);

            setAvatarUrl(publicUrl);
            setMessage({ type: 'success', text: 'Foto carregada! Clique em SALVAR para confirmar.' });
        } catch (err: any) {
            console.error('Erro detalhado do upload:', err);
            setMessage({
                type: 'error',
                text: `Erro ao carregar: ${err.message || 'Verifique sua conexão ou tente outra imagem.'}`
            });
        } finally {
            setUploading(false);
            if (fileInputRef.current) fileInputRef.current.value = '';
        }
    };

    const handleUpdateProfile = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setMessage(null);

        try {
            // First check if it exists
            const { data: existing } = await supabase
                .from('profiles')
                .select('id')
                .eq('id', user.id)
                .maybeSingle();

            let error;
            if (existing) {
                const { error: updateError } = await supabase
                    .from('profiles')
                    .update({
                        name,
                        avatar_url: avatarUrl,
                        avatar_pos_x: posX,
                        avatar_pos_y: posY,
                        avatar_zoom: zoom,
                    })
                    .eq('id', user.id);
                error = updateError;
            } else {
                const { error: insertError } = await supabase
                    .from('profiles')
                    .insert({
                        id: user.id,
                        name,
                        role: user.role,
                        avatar_url: avatarUrl,
                        avatar_pos_x: posX,
                        avatar_pos_y: posY,
                        avatar_zoom: zoom,
                    });
                error = insertError;
            }

            if (error) throw error;

            if (onUpdate) {
                await onUpdate();
            }

            setMessage({ type: 'success', text: 'Perfil atualizado com sucesso!' });
        } catch (err: any) {
            console.error('Error updating profile:', err);
            setMessage({
                type: 'error',
                text: `Erro ao salvar perfil: ${err.message || 'Tente novamente.'}`
            });
        } finally {
            setLoading(false);
        }
    };

    const handleDeleteAccount = async () => {
        try {
            setDeleting(true);

            // 1. Deletar o perfil (as cascatas do banco devem cuidar do resto se configuradas)
            const { error: profileError } = await supabase
                .from('profiles')
                .delete()
                .eq('id', user.id);

            if (profileError) throw profileError;

            // 2. Tentar deletar o usuário do Auth via RPC (se existir)
            // Se não existir, o logout já "remove" o acesso do usuário
            try {
                await supabase.rpc('delete_user_account');
            } catch (rpcErr) {
                console.warn('RPC delete_user_account não encontrado ou falhou, procedendo com logout');
            }

            // 3. Logout e redirecionamento
            if (onLogout) {
                onLogout();
            } else {
                await supabase.auth.signOut();
                navigate('/');
            }
        } catch (err: any) {
            console.error('Erro ao excluir conta:', err);
            setMessage({
                type: 'error',
                text: `Erro ao excluir conta: ${err.message || 'Tente novamente.'}`
            });
            setShowDeleteConfirm(false);
        } finally {
            setDeleting(false);
        }
    };

    return (
        <div className="relative flex h-full min-h-screen w-full flex-col overflow-hidden max-w-md mx-auto bg-background-dark text-white">
            <header className="flex items-center justify-between px-4 py-4 sticky top-0 z-10 bg-background-dark/95 backdrop-blur-md border-b border-white/5">
                <button onClick={() => navigate(-1)} className="size-10 flex items-center justify-center text-white/60 hover:text-white transition-colors">
                    <span className="material-symbols-outlined">arrow_back_ios</span>
                </button>
                <h1 className="text-white font-bold tracking-tight">Editar Perfil</h1>
                <div className="w-10"></div>
            </header>

            <main className="p-6 space-y-8 flex-1 overflow-y-auto no-scrollbar">
                <div className="flex flex-col items-center gap-4">
                    <div className="relative">
                        <div
                            className={`size-32 rounded-3xl bg-cover bg-center ring-4 ring-primary/20 shadow-2xl transition-all duration-300 overflow-hidden bg-surface-dark flex items-center justify-center ${uploading ? 'scale-95 opacity-50' : ''}`}
                            style={{
                                backgroundImage: avatarUrl ? `url("${avatarUrl}")` : 'none',
                                backgroundPosition: `${posX}% ${posY}%`,
                                backgroundSize: `${zoom}%`
                            }}
                        >
                            {!avatarUrl && !uploading && <span className="material-symbols-outlined text-4xl text-white/10">person</span>}
                            {uploading && (
                                <div className="absolute inset-0 flex items-center justify-center bg-background-dark/40">
                                    <div className="animate-spin h-8 w-8 border-4 border-primary border-t-transparent rounded-full shadow-gold"></div>
                                </div>
                            )}
                        </div>
                        <input
                            type="file"
                            ref={fileInputRef}
                            onChange={handleUpload}
                            accept="image/*"
                            className="hidden"
                        />
                        <button
                            type="button"
                            onClick={() => fileInputRef.current?.click()}
                            disabled={uploading}
                            className="absolute -bottom-2 -right-2 size-10 bg-primary text-background-dark rounded-2xl flex items-center justify-center shadow-gold border-2 border-background-dark hover:scale-110 active:scale-95 transition-all disabled:opacity-50 z-10"
                        >
                            <span className="material-symbols-outlined text-xl">{uploading ? 'sync' : 'photo_camera'}</span>
                        </button>
                    </div>
                    <div className="text-center">
                        <p className="text-primary text-[10px] font-black uppercase tracking-[0.2em]">{user.role === 'BARBER' ? 'Barbeiro' : 'Cliente VIP'}</p>
                    </div>
                </div>

                <form onSubmit={handleUpdateProfile} className="space-y-6">
                    <div className="space-y-2">
                        <label className="text-xs font-bold text-text-muted uppercase tracking-wider ml-1">Nome Completo</label>
                        <div className="relative group">
                            <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                                <span className="material-symbols-outlined text-text-muted group-focus-within:text-primary transition-colors">person</span>
                            </div>
                            <input
                                className="w-full h-14 pl-12 pr-4 bg-surface-dark border border-white/5 rounded-2xl text-white placeholder-text-muted/50 focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary transition-all duration-300"
                                placeholder="Seu nome"
                                value={name}
                                onChange={e => setName(e.target.value)}
                                required
                            />
                        </div>
                    </div>

                    <div className="space-y-2">
                        <label className="text-xs font-bold text-text-muted uppercase tracking-wider ml-1">Ou cole uma URL da Foto</label>
                        <div className="relative group">
                            <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                                <span className="material-symbols-outlined text-text-muted group-focus-within:text-primary transition-colors">link</span>
                            </div>
                            <input
                                className="w-full h-14 pl-12 pr-4 bg-surface-dark border border-white/5 rounded-2xl text-white placeholder-text-muted/50 focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary transition-all duration-300"
                                placeholder="https://exemplo.com/foto.jpg"
                                value={avatarUrl}
                                onChange={e => setAvatarUrl(e.target.value)}
                            />
                        </div>
                    </div>

                    {avatarUrl && (
                        <div className="bg-surface-dark/50 p-6 rounded-[2rem] border border-white/5 space-y-6">
                            <div className="flex items-center gap-2 mb-2">
                                <span className="material-symbols-outlined text-primary text-sm">settings_overscan</span>
                                <h3 className="text-sm font-black text-white uppercase tracking-widest">Ajustes da Foto</h3>
                            </div>

                            <div className="space-y-6">
                                <div className="space-y-3">
                                    <div className="flex justify-between text-[10px] font-black uppercase tracking-widest text-text-muted">
                                        <span>Zoom</span>
                                        <span className="text-primary">{zoom}%</span>
                                    </div>
                                    <input
                                        type="range" min="100" max="300" value={zoom}
                                        onChange={(e) => setZoom(parseInt(e.target.value))}
                                        className="w-full h-1.5 bg-background-dark rounded-lg appearance-none cursor-pointer accent-primary"
                                    />
                                </div>

                                <div className="space-y-3">
                                    <div className="flex justify-between text-[10px] font-black uppercase tracking-widest text-text-muted">
                                        <span>Posição Horizontal</span>
                                        <span className="text-primary">{posX}%</span>
                                    </div>
                                    <input
                                        type="range" min="0" max="100" value={posX}
                                        onChange={(e) => setPosX(parseInt(e.target.value))}
                                        className="w-full h-1.5 bg-background-dark rounded-lg appearance-none cursor-pointer accent-primary"
                                    />
                                </div>

                                <div className="space-y-3">
                                    <div className="flex justify-between text-[10px] font-black uppercase tracking-widest text-text-muted">
                                        <span>Posição Vertical</span>
                                        <span className="text-primary">{posY}%</span>
                                    </div>
                                    <input
                                        type="range" min="0" max="100" value={posY}
                                        onChange={(e) => setPosY(parseInt(e.target.value))}
                                        className="w-full h-1.5 bg-background-dark rounded-lg appearance-none cursor-pointer accent-primary"
                                    />
                                </div>
                            </div>
                        </div>
                    )}

                    <div className="pt-4">
                        {message && (
                            <div className={`mb-6 p-4 rounded-2xl text-sm font-bold flex items-center gap-3 animate-in fade-in slide-in-from-top-2 duration-300 ${message.type === 'success' ? 'bg-green-500/10 text-green-500 border border-green-500/20' : 'bg-red-500/10 text-red-500 border border-red-500/20'}`}>
                                <span className="material-symbols-outlined text-xl">{message.type === 'success' ? 'check_circle' : 'error'}</span>
                                {message.text}
                            </div>
                        )}

                        <button
                            type="submit"
                            disabled={loading || uploading || deleting}
                            className={`w-full h-16 bg-primary text-background-dark font-black text-lg rounded-2xl shadow-gold transition-all active:scale-[0.98] flex items-center justify-center gap-3 ${loading || uploading || deleting ? 'opacity-50 cursor-wait' : 'hover:bg-[#c9a026]'}`}
                        >
                            {loading ? (
                                <>
                                    <div className="animate-spin h-5 w-5 border-2 border-background-dark border-t-transparent rounded-full"></div>
                                    <span>Salvando...</span>
                                </>
                            ) : (
                                <>
                                    <span>SALVAR ALTERAÇÕES</span>
                                    <span className="material-symbols-outlined">save</span>
                                </>
                            )}
                        </button>
                    </div>

                    {user.role === 'BARBER' && (
                        <div className="pt-10 pb-6">
                            <div className="p-6 rounded-[2rem] border border-red-500/20 bg-red-500/5 space-y-4">
                                <div className="flex items-center gap-2 text-red-500">
                                    <span className="material-symbols-outlined">warning</span>
                                    <h3 className="text-sm font-black uppercase tracking-widest">Zona de Perigo</h3>
                                </div>
                                <p className="text-xs text-white/50 leading-relaxed">
                                    Ao excluir sua conta, todos os seus dados, serviços e agendamentos serão removidos permanentemente. Esta ação não pode ser desfeita.
                                </p>
                                <button
                                    type="button"
                                    onClick={() => setShowDeleteConfirm(true)}
                                    className="w-full h-12 rounded-xl border border-red-500/50 text-red-500 font-black text-xs uppercase tracking-widest hover:bg-red-500 hover:text-white transition-all active:scale-95"
                                >
                                    Excluir Minha Conta
                                </button>
                            </div>
                        </div>
                    )}
                </form>
            </main>

            {/* Modal de Confirmação de Exclusão */}
            {showDeleteConfirm && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-background-dark/80 backdrop-blur-md animate-in fade-in duration-300">
                    <div className="w-full max-w-sm bg-surface-dark rounded-[2.5rem] border border-white/5 p-8 shadow-2xl animate-in zoom-in-95 duration-300">
                        <div className="size-20 bg-red-500/10 rounded-[2rem] flex items-center justify-center text-red-500 mx-auto mb-6">
                            <span className="material-symbols-outlined text-4xl">delete_forever</span>
                        </div>

                        <h2 className="text-2xl font-black text-white text-center mb-4 tracking-tight">Tem certeza absoluta?</h2>
                        <p className="text-sm text-white/60 text-center mb-8 leading-relaxed">
                            Isso apagará permanentemente seu perfil de barbeiro, serviços cadastrados e histórico de atendimentos.
                        </p>

                        <div className="space-y-3">
                            <button
                                onClick={handleDeleteAccount}
                                disabled={deleting}
                                className="w-full h-14 bg-red-500 text-white font-black rounded-2xl shadow-xl shadow-red-500/20 flex items-center justify-center gap-3 transition-all active:scale-95 disabled:opacity-50"
                            >
                                {deleting ? (
                                    <>
                                        <div className="animate-spin h-5 w-5 border-2 border-white border-t-transparent rounded-full"></div>
                                        <span>EXCLUINDO...</span>
                                    </>
                                ) : (
                                    <>
                                        <span>SIM, EXCLUIR TUDO</span>
                                        <span className="material-symbols-outlined">check</span>
                                    </>
                                )}
                            </button>

                            <button
                                onClick={() => setShowDeleteConfirm(false)}
                                disabled={deleting}
                                className="w-full h-14 bg-white/5 text-white/60 font-black rounded-2xl hover:bg-white/10 transition-all active:scale-95 disabled:opacity-50"
                            >
                                CANCELAR
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default Profile;
