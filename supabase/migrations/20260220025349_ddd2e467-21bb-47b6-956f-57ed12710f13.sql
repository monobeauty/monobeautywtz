-- Add unique constraint on numero_opcao
ALTER TABLE public.setores_atendimento ADD CONSTRAINT setores_atendimento_numero_opcao_unique UNIQUE (numero_opcao);