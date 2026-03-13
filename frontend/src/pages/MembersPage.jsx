import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { motion } from 'framer-motion'
import { Users, Plus, Trash2, UserPlus, Crown, Shield, User } from 'lucide-react'
import { orgApi } from '@/api/services'
import { useAuthStore } from '@/store/authStore'
import { Button, Modal, Input, Badge, EmptyState, Spinner, Avatar, Card } from '@/components/ui'
import PageHeader from '@/components/layout/PageHeader'
import { getRoleConfig, formatDate, extractError, cn } from '@/utils/helpers'
import toast from 'react-hot-toast'

const roleIcons = { owner: Crown, admin: Shield, member: User }

export default function MembersPage() {
  const { currentOrgId, user } = useAuthStore()
  const qc = useQueryClient()
  const [showAdd, setShowAdd] = useState(false)

  const { data: members = [], isLoading } = useQuery({
    queryKey: ['members', currentOrgId],
    queryFn: () => orgApi.getMembers(currentOrgId).then((r) => r.data),
    enabled: !!currentOrgId,
  })

  const removeMutation = useMutation({
    mutationFn: (memberId) => orgApi.removeMember(currentOrgId, memberId),
    onSuccess: () => { qc.invalidateQueries(['members']); toast.success('Member removed') },
    onError: (e) => toast.error(extractError(e)),
  })

  if (!currentOrgId) {
    return (
      <div className="p-6">
        <PageHeader title="Members" />
        <EmptyState icon={Users} title="No organization selected" description="Set up an organization in Settings to manage members." />
      </div>
    )
  }

  return (
    <div className="p-6 max-w-3xl mx-auto">
      <PageHeader
        title="Members"
        subtitle={`${members.length} member${members.length !== 1 ? 's' : ''} in your organization`}
        actions={
          <Button size="sm" onClick={() => setShowAdd(true)}>
            <UserPlus size={13} /> Invite member
          </Button>
        }
      />

      {isLoading ? (
        <div className="flex justify-center pt-16"><Spinner size={24} /></div>
      ) : members.length === 0 ? (
        <EmptyState
          icon={Users}
          title="No members yet"
          description="Invite your team members to collaborate on projects."
          action={<Button size="sm" onClick={() => setShowAdd(true)}><Plus size={13} /> Invite member</Button>}
        />
      ) : (
        <motion.div
          className="space-y-2"
          initial="hidden"
          animate="visible"
          variants={{ visible: { transition: { staggerChildren: 0.05 } } }}
        >
          {members.map((member) => {
            const roleCfg = getRoleConfig(member.role)
            const RoleIcon = roleIcons[member.role] || User
            const isMe = member.user_id === user?.id

            return (
              <motion.div
                key={member.id}
                variants={{ hidden: { opacity: 0, y: 8 }, visible: { opacity: 1, y: 0 } }}
              >
                <Card className="flex items-center gap-4 group">
                  <Avatar name={member.user_id.slice(0, 6)} size="md" />

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="text-sm font-medium text-ink-200 truncate font-mono text-xs">{member.user_id.slice(0, 8)}...</p>
                      {isMe && <Badge className="text-volt-400 bg-volt-400/10 text-[10px]">You</Badge>}
                    </div>
                    <p className="text-xs text-ink-600 mt-0.5">Joined {formatDate(member.joined_at)}</p>
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    <Badge className={cn('gap-1', roleCfg.color, roleCfg.bg)}>
                      <RoleIcon size={10} />
                      {roleCfg.label}
                    </Badge>

                    {member.role !== 'owner' && !isMe && (
                      <button
                        onClick={() => removeMutation.mutate(member.id)}
                        className="w-7 h-7 rounded-lg hover:bg-coral-400/10 flex items-center justify-center text-ink-600 hover:text-coral-400 transition-colors opacity-0 group-hover:opacity-100"
                      >
                        <Trash2 size={12} />
                      </button>
                    )}
                  </div>
                </Card>
              </motion.div>
            )
          })}
        </motion.div>
      )}

      <AddMemberModal
        open={showAdd}
        onClose={() => setShowAdd(false)}
        orgId={currentOrgId}
      />
    </div>
  )
}

function AddMemberModal({ open, onClose, orgId }) {
  const qc = useQueryClient()
  const [userId, setUserId] = useState('')
  const [error, setError] = useState('')

  const mutation = useMutation({
    mutationFn: () => orgApi.addMember(orgId, userId),
    onSuccess: () => {
      qc.invalidateQueries(['members'])
      toast.success('Member added!')
      setUserId('')
      onClose()
    },
    onError: (e) => toast.error(extractError(e)),
  })

  const handleSubmit = (e) => {
    e.preventDefault()
    if (!userId.trim()) return setError('User ID is required')
    setError('')
    mutation.mutate()
  }

  return (
    <Modal open={open} onClose={onClose} title="Invite Member">
      <form onSubmit={handleSubmit} className="space-y-4">
        <Input
          label="User ID"
          placeholder="Paste the user's UUID"
          value={userId}
          onChange={(e) => setUserId(e.target.value)}
          error={error}
          autoFocus
        />
        <p className="text-xs text-ink-600">
          Ask your team member to share their User ID from their profile settings.
        </p>
        <div className="flex justify-end gap-2 pt-1">
          <Button type="button" variant="ghost" onClick={onClose}>Cancel</Button>
          <Button type="submit" loading={mutation.isPending}>Add member</Button>
        </div>
      </form>
    </Modal>
  )
}
