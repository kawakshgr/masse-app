import SwiftUI
import PhotosUI

/// Three poses, three slots. Not a gallery — the check-in is a comparison, and
/// a pile of photos is not one.
///
/// The picker is PhotosPicker, which asks for nothing: the person chooses the
/// image in a sheet the app never sees, so there is no photo-library permission
/// to grant and no library to read. Everything else here is reachable only by
/// her and her coach, enforced at the bucket.
struct PoseGrid: View {
    let checkInId: String

    @State private var photos: [CheckInPhoto] = []
    @State private var urls: [String: URL] = [:]
    @State private var picking: String?
    @State private var item: PhotosPickerItem?
    @State private var busy: String?
    @State private var failed = false

    var body: some View {
        VStack(alignment: .leading, spacing: 10) {
            Text(L.t("photos.title")).kicker()

            HStack(spacing: 8) {
                ForEach(PhotoFeed.poses, id: \.self) { pose in
                    slot(pose)
                }
            }

            Text(L.t(failed ? "photos.failed" : "bilan.discipline"))
                .font(Ty.copySmall)
                .foregroundStyle(failed ? Tk.a3 : Tk.ink3)
                .fixedSize(horizontal: false, vertical: true)
        }
        .photosPicker(
            isPresented: Binding(
                get: { picking != nil },
                set: { if !$0 { picking = nil } }
            ),
            selection: $item,
            matching: .images
        )
        .onChange(of: item) { _, new in
            guard let new, let pose = picking else { return }
            Task { await accept(new, pose: pose) }
        }
        .task { await load() }
    }

    private func slot(_ pose: String) -> some View {
        Button {
            item = nil
            picking = pose
        } label: {
            VStack(spacing: 6) {
                ZStack {
                    RoundedRectangle(cornerRadius: Tk.R.r1)
                        .fill(Tk.glass2)
                        .aspectRatio(3.0 / 4.0, contentMode: .fit)

                    if busy == pose {
                        ProgressView().tint(Tk.a1)
                    } else if let url = urls[pose] {
                        AsyncImage(url: url) { image in
                            image.resizable().scaledToFill()
                        } placeholder: {
                            ProgressView().tint(Tk.a1)
                        }
                        .clipShape(RoundedRectangle(cornerRadius: Tk.R.r1))
                    } else {
                        Image(systemName: "plus")
                            .font(.system(size: 17, weight: .semibold))
                            .foregroundStyle(Tk.ink3)
                    }
                }
                .clipShape(RoundedRectangle(cornerRadius: Tk.R.r1))

                Text(L.t("review.poses.\(pose)"))
                    .font(Ty.copySmall)
                    .foregroundStyle(urls[pose] == nil ? Tk.ink3 : Tk.ink2)
            }
        }
        .buttonStyle(.plain)
        .accessibilityLabel(L.t("review.poses.\(pose)"))
    }

    private func accept(_ picked: PhotosPickerItem, pose: String) async {
        picking = nil
        busy = pose
        defer { busy = nil }

        guard let raw = try? await picked.loadTransferable(type: Data.self),
              let image = UIImage(data: raw),
              // Re-encoded rather than sent as picked: a phone photo is several
              // megabytes of detail nobody looks at on a check-in, and the
              // bucket caps at eight.
              let jpeg = image.jpegData(compressionQuality: 0.8)
        else {
            failed = true
            return
        }

        failed = !(await PhotoFeed.upload(jpeg, pose: pose, checkInId: checkInId))
        item = nil
        await load()
    }

    private func load() async {
        photos = await PhotoFeed.forCheckIn(checkInId)
        var next: [String: URL] = [:]
        for photo in photos {
            if let url = await PhotoFeed.signedURL(photo.storagePath) {
                next[photo.pose] = url
            }
        }
        urls = next
    }
}
