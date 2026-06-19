import express, { Response } from 'express';
import DocumentModel from '../models/Document.js';
import { authenticateToken, requirePermission, AuthenticatedRequest } from '../middleware/auth.js';
import { logSecurityEvent } from '../utils/auditLogger.js';

const router = express.Router();

// Apply authenticateToken to all routes in this router
router.use(authenticateToken);

// GET / - Read documents based on resolved scope
router.get('/', requirePermission('read:documents'), async (req: AuthenticatedRequest, res: Response) => {
  try {
    const scope = req.permissionScope;
    let query: any = {};

    if (scope === 'self') {
      query = { ownerId: req.user!._id };
    } else if (scope === 'team') {
      query = { team: req.user!.team };
    } // 'global' scope matches everything (query remains empty object)

    const documents = await DocumentModel.find(query).sort({ createdAt: -1 });
    res.json({ documents, scope });
  } catch (error) {
    console.error('Error fetching documents:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
});

// POST / - Create a new document
router.post('/', requirePermission('create:documents'), async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { title, content } = req.body;

    if (!title || !content) {
      return res.status(400).json({ message: 'Title and content are required' });
    }

    const document = new DocumentModel({
      title,
      content,
      ownerId: req.user!._id,
      ownerEmail: req.user!.email,
      team: req.user!.team,
    });

    await document.save();

    await logSecurityEvent({
      userId: req.user!._id.toString(),
      email: req.user!.email,
      action: 'create_document',
      resource: 'documents',
      resourceId: document._id.toString(),
      status: 'success',
      details: { title },
      req: req as any,
    });

    res.status(201).json(document);
  } catch (error) {
    console.error('Error creating document:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
});

// PUT /:id - Edit a document, respecting scope
router.put('/:id', requirePermission('edit:documents'), async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { title, content } = req.body;
    const id = req.params.id as string;

    if (!title || !content) {
      return res.status(400).json({ message: 'Title and content are required' });
    }

    const document = await DocumentModel.findById(id);
    if (!document) {
      return res.status(404).json({ message: 'Document not found' });
    }

    const scope = req.permissionScope;

    // Scoped ownership check
    if (scope === 'self' && document.ownerId.toString() !== req.user!._id.toString()) {
      await logSecurityEvent({
        userId: req.user!._id.toString(),
        email: req.user!.email,
        action: 'denied:edit_document_ownership',
        resource: 'documents',
        resourceId: id,
        status: 'denied',
        details: { reason: 'Scope self restricts editing documents owned by other users' },
        req: req as any,
      });
      return res.status(403).json({ message: 'Access denied. You can only edit your own documents.' });
    }

    if (scope === 'team' && document.team !== req.user!.team) {
      await logSecurityEvent({
        userId: req.user!._id.toString(),
        email: req.user!.email,
        action: 'denied:edit_document_team',
        resource: 'documents',
        resourceId: id,
        status: 'denied',
        details: { reason: `Scope team restricts editing documents outside user team '${req.user!.team}'` },
        req: req as any,
      });
      return res.status(403).json({ message: `Access denied. You can only edit documents belonging to your team (${req.user!.team}).` });
    }

    // Perform update
    document.title = title;
    document.content = content;
    await document.save();

    await logSecurityEvent({
      userId: req.user!._id.toString(),
      email: req.user!.email,
      action: 'edit_document',
      resource: 'documents',
      resourceId: id,
      status: 'success',
      details: { title },
      req: req as any,
    });

    res.json(document);
  } catch (error) {
    console.error('Error updating document:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
});

// DELETE /:id - Delete a document, respecting scope
router.delete('/:id', requirePermission('delete:documents'), async (req: AuthenticatedRequest, res: Response) => {
  try {
    const id = req.params.id as string;

    const document = await DocumentModel.findById(id);
    if (!document) {
      return res.status(404).json({ message: 'Document not found' });
    }

    const scope = req.permissionScope;

    // Scoped ownership check
    if (scope === 'self' && document.ownerId.toString() !== req.user!._id.toString()) {
      await logSecurityEvent({
        userId: req.user!._id.toString(),
        email: req.user!.email,
        action: 'denied:delete_document_ownership',
        resource: 'documents',
        resourceId: id,
        status: 'denied',
        details: { reason: 'Scope self restricts deleting documents owned by other users' },
        req: req as any,
      });
      return res.status(403).json({ message: 'Access denied. You can only delete your own documents.' });
    }

    if (scope === 'team' && document.team !== req.user!.team) {
      await logSecurityEvent({
        userId: req.user!._id.toString(),
        email: req.user!.email,
        action: 'denied:delete_document_team',
        resource: 'documents',
        resourceId: id,
        status: 'denied',
        details: { reason: `Scope team restricts deleting documents outside user team '${req.user!.team}'` },
        req: req as any,
      });
      return res.status(403).json({ message: `Access denied. You can only delete documents belonging to your team (${req.user!.team}).` });
    }

    // Perform delete
    await DocumentModel.findByIdAndDelete(id);

    await logSecurityEvent({
      userId: req.user!._id.toString(),
      email: req.user!.email,
      action: 'delete_document',
      resource: 'documents',
      resourceId: id,
      status: 'success',
      details: { title: document.title },
      req: req as any,
    });

    res.json({ message: 'Document deleted successfully' });
  } catch (error) {
    console.error('Error deleting document:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
});

export default router;
