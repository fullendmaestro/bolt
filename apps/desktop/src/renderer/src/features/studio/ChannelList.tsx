import { Plus } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import type { ChannelList as StudioChannelList } from '@/hooks/useChannel'

interface ChannelListProps {
  channelsList: StudioChannelList
  activeChannelKey: string | null
  onSelectChannel: (key: string) => void
  onCreateChannel: () => void
}

function ChannelCard({
  channel,
  active,
  fallbackClassName,
  onSelect
}: {
  channel: StudioChannelList['owned'][number]
  active: boolean
  fallbackClassName: string
  onSelect: () => void
}) {
  return (
    <div
      onClick={onSelect}
      className={`flex items-center gap-3 p-3 rounded-xl cursor-pointer transition-colors ${active ? 'bg-indigo-500/10 border border-indigo-500/50' : 'bg-[#121212] border border-neutral-800 hover:bg-white/5'}`}
    >
      <div className="h-10 w-10 rounded-full overflow-hidden bg-neutral-800 shrink-0">
        {channel.avatar ? (
          <img src={channel.avatar} alt={channel.name} className="w-full h-full object-cover" />
        ) : (
          <div
            className={`w-full h-full flex items-center justify-center font-bold ${fallbackClassName}`}
          >
            {channel.name.charAt(0).toUpperCase()}
          </div>
        )}
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-semibold text-white truncate">{channel.name}</p>
        <p className="text-xs text-neutral-500 truncate">
          {channel.description || 'No description'}
        </p>
      </div>
    </div>
  )
}

export function ChannelList({
  channelsList,
  activeChannelKey,
  onSelectChannel,
  onCreateChannel
}: ChannelListProps) {
  return (
    <div className="w-80 shrink-0 flex flex-col gap-6">
      <h1 className="text-2xl font-bold text-white tracking-tight">Channel Studio</h1>

      <Tabs defaultValue="owned" className="w-full">
        <TabsList className="grid w-full grid-cols-2 bg-neutral-900 mb-4 p-1 rounded-xl">
          <TabsTrigger
            value="owned"
            className="rounded-lg data-[state=active]:bg-[#1a1a1a] data-[state=active]:text-white text-neutral-400"
          >
            My Channels
          </TabsTrigger>
          <TabsTrigger
            value="joined"
            className="rounded-lg data-[state=active]:bg-[#1a1a1a] data-[state=active]:text-white text-neutral-400"
          >
            Joined
          </TabsTrigger>
        </TabsList>

        <TabsContent value="owned" className="flex flex-col gap-2 mt-0">
          <Button
            variant="outline"
            onClick={onCreateChannel}
            className="w-full border-dashed border-neutral-700 bg-transparent text-neutral-400 hover:text-white hover:border-neutral-500 mb-2"
          >
            <Plus className="h-4 w-4 mr-2" /> Create New Channel
          </Button>

          {channelsList.owned.length === 0 && (
            <p className="text-xs text-neutral-500 text-center py-4">
              You have not created any channels yet.
            </p>
          )}

          {channelsList.owned.map((channel) => (
            <ChannelCard
              key={channel.publicKey}
              channel={channel}
              active={activeChannelKey === channel.publicKey}
              fallbackClassName="bg-indigo-500/20 text-indigo-400"
              onSelect={() => onSelectChannel(channel.publicKey)}
            />
          ))}
        </TabsContent>

        <TabsContent value="joined" className="flex flex-col gap-2 mt-0">
          {channelsList.joined.length === 0 && (
            <p className="text-xs text-neutral-500 text-center py-4">
              You have not joined any channels yet.
            </p>
          )}
          {channelsList.joined.map((channel) => (
            <ChannelCard
              key={channel.publicKey}
              channel={channel}
              active={activeChannelKey === channel.publicKey}
              fallbackClassName="bg-emerald-500/20 text-emerald-400"
              onSelect={() => onSelectChannel(channel.publicKey)}
            />
          ))}
        </TabsContent>
      </Tabs>
    </div>
  )
}
