import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';

import { customGet } from 'api';
import { Button } from 'components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from 'components/ui/card';
import { Input } from 'components/ui/input';
import { Label } from 'components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from 'components/ui/select';

type GeneratedComponent = {
  type: 'text' | 'input' | 'select' | 'button' | 'list';
  name?: string;
  label?: string;
  value?: string;
  input_type?: 'text' | 'number' | 'date';
  options?: string[];
  action?: string;
  target?: string;
  source?: string;
};

type GeneratedPage = {
  id: string;
  title: string;
  components: GeneratedComponent[];
};

type GeneratedConfig = {
  title: string;
  description: string;
  theme?: string;
  pages: GeneratedPage[];
};

function isGeneratedConfig(value: unknown): value is GeneratedConfig {
  if (!value || typeof value !== 'object') {
    return false;
  }
  const config = value as Partial<GeneratedConfig>;
  return typeof config.title === 'string' && Array.isArray(config.pages);
}

function renderComponent(component: GeneratedComponent, index: number) {
  const key = `${component.type}-${component.name ?? component.label ?? index}`;

  if (component.type === 'text') {
    return (
      <p className="text-sm text-muted-foreground" key={key}>
        {component.value || component.label}
      </p>
    );
  }

  if (component.type === 'input') {
    return (
      <div className="grid gap-2" key={key}>
        <Label>{component.label || component.name || 'Input'}</Label>
        <Input
          name={component.name}
          placeholder={component.value || component.label}
          type={component.input_type || 'text'}
        />
      </div>
    );
  }

  if (component.type === 'select') {
    return (
      <div className="grid gap-2" key={key}>
        <Label>{component.label || component.name || 'Select'}</Label>
        <Select>
          <SelectTrigger>
            <SelectValue placeholder={component.label || 'Select option'} />
          </SelectTrigger>
          <SelectContent>
            {(component.options ?? []).map((option) => (
              <SelectItem key={option} value={option}>
                {option}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
    );
  }

  if (component.type === 'button') {
    return (
      <Button className="w-fit" key={key} type="button">
        {component.label || component.action || 'Action'}
      </Button>
    );
  }

  if (component.type === 'list') {
    const items = component.options?.length ? component.options : [component.value || 'No items yet'];
    return (
      <ul className="grid gap-2 text-sm" key={key}>
        {items.map((item) => (
          <li className="rounded-md border px-3 py-2" key={item}>
            {item}
          </li>
        ))}
      </ul>
    );
  }

  return null;
}

export function GeneratedAppPage() {
  const { generatedAppId } = useParams();
  const [config, setConfig] = useState<GeneratedConfig | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function loadConfig() {
      if (!generatedAppId) {
        setError('Generated app is not found');
        setIsLoading(false);
        return;
      }

      const response = await customGet<unknown>(`/api/generated-apps/${generatedAppId}/config`);

      if (response.isError || !isGeneratedConfig(response.data)) {
        setError(response.errorMessage ?? 'Failed to load generated app');
        setIsLoading(false);
        return;
      }

      setConfig(response.data);
      setIsLoading(false);
    }

    void loadConfig();
  }, [generatedAppId]);

  if (isLoading) {
    return (
      <main className="mx-auto max-w-3xl px-4 py-8">
        <Card>
          <CardContent className="py-10 text-center text-sm text-muted-foreground">
            Loading generated app...
          </CardContent>
        </Card>
      </main>
    );
  }

  if (error || !config) {
    return (
      <main className="mx-auto max-w-3xl px-4 py-8">
        <Card>
          <CardContent className="py-10 text-center text-sm text-destructive">
            {error || 'Generated app is unavailable'}
          </CardContent>
        </Card>
      </main>
    );
  }

  return (
    <main className="mx-auto grid max-w-3xl gap-5 px-4 py-8">
      <header>
        <p className="text-sm text-muted-foreground">{config.theme || 'Generated MiniApp'}</p>
        <h1 className="mt-2 text-3xl font-semibold tracking-normal">{config.title}</h1>
        <p className="mt-2 text-muted-foreground">{config.description}</p>
      </header>

      {config.pages.map((page) => (
        <Card key={page.id || page.title}>
          <CardHeader>
            <CardTitle>{page.title}</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-4">
            {page.components.map((component, index) => renderComponent(component, index))}
          </CardContent>
        </Card>
      ))}
    </main>
  );
}
