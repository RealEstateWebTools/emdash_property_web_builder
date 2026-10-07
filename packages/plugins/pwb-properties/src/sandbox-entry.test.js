import { describe, expect, it, vi } from 'vitest';
import plugin from './sandbox-entry.js';

const property = {
  slug: 'villa-marbella', title: 'Marbella Villa', for_sale: true,
  formatted_price: '€450,000', city: 'Marbella', description: '<p>A bright home</p>',
};
const listingResponse = { data: [property], meta: { total: 45, page: 2, total_pages: 3 } };
function context(apiUrl = 'https://pwb.example.test') {
  return {
    kv: { get: vi.fn().mockResolvedValue(apiUrl), set: vi.fn() },
    http: { fetch: vi.fn().mockResolvedValue(new Response(JSON.stringify(listingResponse))) },
    log: { info: vi.fn(), warn: vi.fn(), error: vi.fn() },
  };
}
const invoke = (ctx, input = {}) => plugin.routes.admin.handler({ input }, ctx);
const settingsInput = (url) => ({ page: '/settings', action_id: 'save_settings', values: { pwbApiUrl: url } });
const actions = (response) => response.blocks.flatMap((block) => block.elements ?? [block.accessory].filter(Boolean));

describe('properties admin runtime', () => {
  it('shows setup instructions without network access when unconfigured', async () => {
    const ctx = context(null);
    const result = await invoke(ctx);
    expect(ctx.http.fetch).not.toHaveBeenCalled();
    expect(result.blocks.some((block) => block.title?.includes('not configured'))).toBe(true);
  });

  it('saves a normalized API base without changing public-site configuration', async () => {
    const ctx = context(null);
    const result = await invoke(ctx, settingsInput(' https://pwb.example.test/ '));
    expect(ctx.kv.set).toHaveBeenCalledWith('settings:pwbApiUrl', 'https://pwb.example.test');
    expect(result.toast.type).toBe('success');
    expect(ctx.http.fetch).not.toHaveBeenCalled();
    expect(JSON.stringify(result.blocks)).toContain('configured separately');
  });

  it.each(['', 'not a URL', 'ftp://pwb.example.test', 'https://pwb.example.test?key=fixture',
    'https://pwb.example.test#fragment', 'https://fixture-user@pwb.example.test'])
  ('rejects an unsuitable API base: %s', async (url) => {
    const ctx = context();
    const result = await invoke(ctx, settingsInput(url));
    expect(result.toast.type).toBe('error');
    expect(ctx.kv.set).not.toHaveBeenCalled();
    expect(ctx.http.fetch).not.toHaveBeenCalled();
    const form = result.blocks.find((block) => block.type === 'form');
    expect(form.fields[0].initial_value).toBe('');
  });

  it('does not fetch from a previously stored invalid URL', async () => {
    const ctx = context('https://fixture-user@pwb.example.test');
    await invoke(ctx);
    expect(ctx.http.fetch).not.toHaveBeenCalled();
  });

  it('does not log entered or configured URLs', async () => {
    const ctx = context();
    await invoke(ctx, settingsInput('https://pwb.example.test/tenant'));
    await invoke(ctx);
    const logs = JSON.stringify(Object.values(ctx.log).flatMap((fn) => fn.mock.calls));
    expect(logs).not.toContain('pwb.example.test');
  });

  it.each([['filter:all', null], ['filter:sale', 'sale'], ['filter:rental', 'rental']])
  ('applies %s and resets pagination', async (action_id, mode) => {
    const ctx = context();
    await invoke(ctx, { action_id });
    const url = new URL(ctx.http.fetch.mock.calls[0][0]);
    expect(url.pathname).toBe('/api_public/v1/en/properties');
    expect(url.searchParams.get('page')).toBe('1');
    expect(url.searchParams.get('per_page')).toBe('20');
    expect(url.searchParams.get('sale_or_rental')).toBe(mode);
  });

  it('preserves filters across pagination and offers previous/next actions', async () => {
    const ctx = context();
    const result = await invoke(ctx, { action_id: 'page:2:rental' });
    const url = new URL(ctx.http.fetch.mock.calls[0][0]);
    expect(url.searchParams.get('page')).toBe('2');
    expect(url.searchParams.get('sale_or_rental')).toBe('rental');
    expect(actions(result).map((action) => action.action_id)).toEqual(expect.arrayContaining(['page:1:rental', 'page:3:rental']));
  });

  it('opens details and returns to the same filtered page', async () => {
    const ctx = context();
    const list = await invoke(ctx, { action_id: 'page:2:sale' });
    ctx.http.fetch.mockResolvedValueOnce(new Response(JSON.stringify(property)));
    const view = actions(list).find((action) => action.action_id?.startsWith('view_property:'));
    const detail = await invoke(ctx, { action_id: view.action_id });
    expect(ctx.http.fetch.mock.calls[1][0]).toBe('https://pwb.example.test/api_public/v1/en/properties/villa-marbella');
    expect(detail.blocks[0].text).toBe('Marbella Villa');
    const back = actions(detail).find((action) => action.action_id?.startsWith('back_to_list:'));
    await invoke(ctx, { action_id: back.action_id });
    const url = new URL(ctx.http.fetch.mock.calls[2][0]);
    expect(url.searchParams.get('page')).toBe('2');
    expect(url.searchParams.get('sale_or_rental')).toBe('sale');
  });

  it('reports HTTP and network failures in the admin UI', async () => {
    const ctx = context();
    ctx.http.fetch.mockResolvedValueOnce(new Response('{}', { status: 503 }));
    const failed = await invoke(ctx);
    expect(failed.blocks.some((block) => block.description?.includes('503'))).toBe(true);
    ctx.http.fetch.mockRejectedValueOnce(new Error('Connection unavailable'));
    const offline = await invoke(ctx);
    expect(offline.blocks.some((block) => block.description === 'Connection unavailable')).toBe(true);
  });

  it('handles empty inventory without navigation links', async () => {
    const ctx = context();
    ctx.http.fetch.mockResolvedValueOnce(new Response(JSON.stringify({ data: [], meta: { total: 0, page: 1, total_pages: 1 } })));
    const result = await invoke(ctx);
    expect(result.blocks.some((block) => block.text?.includes('No properties'))).toBe(true);
    expect(actions(result).some((action) => action.action_id?.startsWith('page:'))).toBe(false);
  });
});
