import { CompilerWorkspace } from './CompilerWorkspace';
import { reactTemplates, defaultReactTemplate } from '../data/reactTemplates';

export function ReactCompilerPage() {
  return (
    <CompilerWorkspace
      mode="react"
      templates={reactTemplates}
      defaultTemplate={defaultReactTemplate}
      storageKey="react-compiler-project-v1"
      allowedExtensions={['jsx', 'tsx', 'js', 'ts', 'css']}
    />
  );
}
