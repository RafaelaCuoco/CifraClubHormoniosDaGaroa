/**
 * Glossário canônico em Português Brasileiro (PT-BR) do Cifra Trans.
 * Centraliza todos os rótulos de interface para eliminar mistura PT/EN.
 */
export const PT_BR_GLOSSARY = {
  areas: {
    mural: 'Mural',
    palco: 'Modo Palco',
    playlists: 'Playlists',
    estudio: 'Estúdio'
  },
  player: {
    play: 'Tocar',
    pause: 'Pausar',
    stop: 'Parar',
    loop: 'Repetir',
    metronome: 'Metrônomo',
    studySpeed: 'Velocidade de estudo',
    autoScroll: 'Rolagem automática',
    bpm: 'BPM',
    key: 'Tom',
    originalKey: 'Original',
    instrument: 'Instrumento',
    showSynth: 'Abrir sintetizador',
    hideSynth: 'Ocultar sintetizador'
  },
  auth: {
    login: 'Entrar',
    register: 'Criar conta',
    logout: 'Sair',
    validation: 'Validação',
    loginToEdit: 'Entrar para editar',
    loginToVote: 'Entrar para votar',
    loginToCreate: 'Entrar para criar'
  },
  visibility: {
    public: 'Pública',
    private: 'Privada'
  }
} as const;
